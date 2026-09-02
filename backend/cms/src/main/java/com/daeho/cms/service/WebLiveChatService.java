package com.daeho.cms.service;

import com.daeho.cms.repository.WebLiveChatRepository;
import com.daeho.cms.repository.WebLiveChatRepository.Conversation;
import com.daeho.cms.repository.WebLiveChatRepository.Message;
import com.daeho.cms.repository.WebLiveChatRepository.SessionView;
import com.daeho.cms.service.WebLiveChatInputValidator.MessageInput;
import com.daeho.cms.service.WebLiveChatInputValidator.StartInput;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WebLiveChatService {
  private static final Logger log = LoggerFactory.getLogger(WebLiveChatService.class);
  private static final int MESSAGE_PAGE_SIZE = 100;
  private static final String CLOSED_MESSAGE = "상담이 종료되었습니다.";
  private final WebLiveChatRepository repository;
  private final TelegramLiveChatCredentialService credentials;
  private final TelegramLiveChatGateway gateway;
  private final InquiryWorkflowService inquiries;

  public WebLiveChatService(
      WebLiveChatRepository repository,
      TelegramLiveChatCredentialService credentials,
      TelegramLiveChatGateway gateway,
      InquiryWorkflowService inquiries
  ) {
    this.repository = repository;
    this.credentials = credentials;
    this.gateway = gateway;
    this.inquiries = inquiries;
  }

  public Conversation start(
      WebLiveChatRepository.Visitor visitor,
      StartInput input,
      Map<String, String> requestMeta
  ) {
    var configuration = requireConfiguration();
    var settings = configuration.settings();
    var now = Instant.now();
    var candidate = new Conversation(
        UUID.randomUUID().toString(), visitor.id(), settings.configurationGeneration(),
        settings.targetChatId(), "", input.locale(), "opening", input.name(), input.contact(),
        input.content(), input.consentVersion(), now, "", "", 0L, "", 0L, 0L, 0L,
        now, now, now, null
    );
    var conversation = repository.claimOpen(candidate);
    if (conversation != null) {
      repository.storeInitialVisitorMessage(
          conversation.id(), input.clientMessageKey(), conversation.inquiryContent()
      );
    }
    if (conversation == null || !"opening".equals(conversation.state())) {
      return conversation;
    }
    if (!conversation.pendingAction().isBlank()) {
      return conversation;
    }
    if (conversation.inquiryId().isBlank()) {
      var inquiry = inquiries.createWebLiveChat(
          Map.of(
              "inquiryId", conversation.id(),
              "conversationId", conversation.id(),
              "locale", conversation.locale(),
              "name", conversation.customerName(),
              "contact", conversation.customerContact(),
              "message", conversation.inquiryContent()
          ),
          requestMeta == null ? Map.of() : requestMeta
      );
      conversation = repository.attachInquiry(conversation.id(), text(inquiry.get("id")));
      if (conversation == null) {
        return repository.currentConversation(visitor.id(), settings.configurationGeneration());
      }
    }
    conversation = repository.reserveTopicCreation(conversation.id());
    if (conversation == null) {
      return repository.currentConversation(visitor.id(), settings.configurationGeneration());
    }
    long topicThreadId;
    try {
      topicThreadId = gateway.createForumTopic(
          configuration.botToken(), conversation.targetChatId(), topicTitle(conversation)
      );
    } catch (TelegramLiveChatException error) {
      repository.markNeedsAttention(
          conversation.id(), "topic_creation",
          error.deliveryUncertain() ? "topic_creation_uncertain" : "topic_creation_failed"
      );
      throw error;
    }
    var conversationId = conversation.id();
    try {
      conversation = repository.recordTopic(conversationId, topicThreadId);
    } catch (RuntimeException error) {
      markAttentionAfterMappingFailure(
          conversationId, "topic_creation", "topic_creation_uncertain", error
      );
      throw new TelegramLiveChatException(
          "The Telegram Topic was created but its mapping could not be recorded.",
          error,
          true,
          true
      );
    }
    if (conversation == null) {
      repository.markNeedsAttention(
          conversationId, "topic_creation", "topic_creation_uncertain"
      );
      throw new TelegramLiveChatException(
          "The Telegram Topic was created but its mapping could not be recorded.", true
      );
    }
    return deliverRegistration(conversation, configuration);
  }

  public SessionView session(WebLiveChatRepository.Visitor visitor) {
    var configuration = requireConfiguration();
    var conversation = repository.latestConversation(
        visitor.id(), configuration.settings().configurationGeneration()
    );
    if (conversation == null) {
      return new SessionView(null, List.of(), 0L);
    }
    return new SessionView(
        withoutVisitorBody(conversation),
        repository.ownerMessagesAfter(conversation.id(), 0L, MESSAGE_PAGE_SIZE),
        repository.unreadCount(conversation.id())
    );
  }

  public SendResult send(WebLiveChatRepository.Visitor visitor, MessageInput input) {
    var configuration = requireConfiguration();
    var conversation = requireActiveConversation(visitor, configuration);
    var claim = repository.claimVisitorMessage(
        conversation.id(), input.clientMessageKey(), input.body()
    );
    if (claim == null) {
      throw conflict("The message could not be stored.");
    }
    var message = claim.message();
    if ("already_delivered".equals(claim.status())) {
      return new SendResult(message.id(), "sent");
    }
    if ("in_progress".equals(claim.status())) {
      return new SendResult(message.id(), "in_progress");
    }
    if (!"acquired".equals(claim.status())) {
      throw conflict("The message delivery state is invalid.");
    }
    long telegramMessageId;
    try {
      telegramMessageId = gateway.sendMessage(
          configuration.botToken(), conversation.targetChatId(),
          Long.toString(conversation.topicThreadId()), visitorFollowUp(message.body()),
          Map.of(), null
      );
    } catch (TelegramLiveChatException error) {
      if (!error.deliveryUncertain()) {
        repository.releaseVisitorMessage(message.id());
      }
      throw error;
    }
    if (!repository.markVisitorDelivered(message.id(), telegramMessageId)) {
      throw new TelegramLiveChatException(
          "The visitor message was delivered but its mapping could not be recorded.", true
      );
    }
    return new SendResult(message.id(), "sent");
  }

  public List<Message> messages(WebLiveChatRepository.Visitor visitor, long afterId) {
    var configuration = requireConfiguration();
    var conversation = repository.latestConversation(
        visitor.id(), configuration.settings().configurationGeneration()
    );
    return conversation == null
        ? List.of()
        : repository.ownerMessagesAfter(
            conversation.id(), Math.max(0L, afterId), MESSAGE_PAGE_SIZE
        );
  }

  public Conversation markRead(WebLiveChatRepository.Visitor visitor, long teamMessageId) {
    var configuration = requireConfiguration();
    var conversation = repository.latestConversation(
        visitor.id(), configuration.settings().configurationGeneration()
    );
    if (conversation == null) {
      throw conflict("There is no current conversation.");
    }
    return repository.markRead(conversation.id(), Math.max(0L, teamMessageId));
  }

  public Conversation closeFromCms(String conversationId) {
    var result = repository.close(conversationId, CLOSED_MESSAGE);
    if (result == null) {
      return null;
    }
    var closed = result.conversation();
    if (closed.topicThreadId() <= 0) {
      return closed;
    }
    try {
      var configuration = credentials.current();
      if (configuration.configured()
          && configuration.settings().configurationGeneration()
              == closed.configurationGeneration()
          && configuration.settings().targetChatId().equals(closed.targetChatId())) {
        gateway.closeForumTopic(
            configuration.botToken(), closed.targetChatId(), closed.topicThreadId()
        );
      }
    } catch (RuntimeException error) {
      log.warn("Website live-chat closed in CMS while Telegram Topic closure was unavailable.");
    }
    return closed;
  }

  public Conversation retryRegistrationFromCms(
      String conversationId,
      String expectedAttentionCode
  ) {
    var configuration = requireConfiguration();
    var conversation = repository.reserveRegistrationRetry(
        conversationId, expectedAttentionCode
    );
    if (conversation == null) {
      throw conflict("The registration recovery state changed.");
    }
    if (conversation.configurationGeneration()
        != configuration.settings().configurationGeneration()
        || !conversation.targetChatId().equals(configuration.settings().targetChatId())) {
      repository.markNeedsAttention(
          conversation.id(), "registration_delivery", "registration_configuration_changed"
      );
      throw conflict("The Telegram configuration changed after this conversation opened.");
    }
    return deliverRegistration(conversation, configuration);
  }

  public Conversation resetTopicCreationFromCms(
      String conversationId,
      String expectedAttentionCode
  ) {
    var reset = repository.resetTopicCreation(conversationId, expectedAttentionCode);
    if (reset == null) {
      throw conflict("The Topic recovery state changed.");
    }
    return reset;
  }

  private TelegramLiveChatCredentialService.Credentials requireConfiguration() {
    var configuration = credentials.current();
    if (configuration == null || !configuration.ready()) {
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "Web live chat is temporarily unavailable."
      );
    }
    return configuration;
  }

  private Conversation deliverRegistration(
      Conversation conversation,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    long rootMessageId;
    try {
      rootMessageId = gateway.sendMessage(
          configuration.botToken(), conversation.targetChatId(),
          Long.toString(conversation.topicThreadId()), teamHeader(conversation), Map.of(), null
      );
    } catch (TelegramLiveChatException error) {
      repository.markNeedsAttention(
          conversation.id(), "registration_delivery",
          error.deliveryUncertain()
              ? "registration_delivery_uncertain"
              : "registration_delivery_failed"
      );
      throw error;
    }
    Conversation active;
    try {
      active = repository.activate(conversation.id(), rootMessageId);
    } catch (RuntimeException error) {
      markAttentionAfterMappingFailure(
          conversation.id(), "registration_delivery", "registration_mapping_pending", error
      );
      throw new TelegramLiveChatException(
          "The registration card was delivered but its mapping could not be recorded.",
          error,
          true,
          true
      );
    }
    if (active == null) {
      repository.markNeedsAttention(
          conversation.id(), "registration_delivery", "registration_mapping_pending"
      );
      throw new TelegramLiveChatException(
          "The registration card was delivered but its mapping could not be recorded.", true
      );
    }
    return active;
  }

  private String topicTitle(Conversation conversation) {
    return "문의 · " + conversation.customerName();
  }

  private String teamHeader(Conversation conversation) {
    return """
        🔔 새 실시간 상담

        이름: %s
        연락처: %s
        문의 내용:
        %s
        """.formatted(
        conversation.customerName(), conversation.customerContact(), conversation.inquiryContent()
    ).trim();
  }

  private Conversation requireActiveConversation(
      WebLiveChatRepository.Visitor visitor,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var conversation = repository.currentConversation(
        visitor.id(), configuration.settings().configurationGeneration()
    );
    if (conversation == null || !"active".equals(conversation.state())) {
      throw conflict("There is no active conversation.");
    }
    if (conversation.topicThreadId() <= 0) {
      throw conflict("The conversation Topic is unavailable.");
    }
    return conversation;
  }

  private Conversation withoutVisitorBody(Conversation conversation) {
    return new Conversation(
        conversation.id(), conversation.visitorId(), conversation.configurationGeneration(),
        conversation.targetChatId(), conversation.inquiryId(), conversation.locale(),
        conversation.state(), conversation.customerName(), conversation.customerContact(), "",
        conversation.consentVersion(), conversation.consentedAt(), conversation.attentionCode(),
        conversation.pendingAction(), conversation.pendingMessageId(),
        conversation.pendingClientMessageKey(), conversation.topicThreadId(),
        conversation.topicRootMessageId(), conversation.lastReadTeamMessageId(),
        conversation.lastActivityAt(), conversation.createdAt(), conversation.updatedAt(),
        conversation.closedAt()
    );
  }

  private String visitorFollowUp(String body) {
    return "고객 추가 메시지\n\n" + body;
  }

  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private void markAttentionAfterMappingFailure(
      String conversationId,
      String pendingAction,
      String attentionCode,
      RuntimeException original
  ) {
    try {
      repository.markNeedsAttention(conversationId, pendingAction, attentionCode);
    } catch (RuntimeException recoveryError) {
      original.addSuppressed(recoveryError);
    }
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  public record SendResult(long messageId, String status) {}
}
