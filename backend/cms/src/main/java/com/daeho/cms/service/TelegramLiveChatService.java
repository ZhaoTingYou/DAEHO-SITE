package com.daeho.cms.service;

import com.daeho.cms.repository.TelegramLiveChatRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TelegramLiveChatService {
  private static final Logger log = LoggerFactory.getLogger(TelegramLiveChatService.class);
  private final TelegramLiveChatRepository repository;
  private final TelegramLiveChatCredentialService credentials;
  private final TelegramLiveChatGateway gateway;
  private final InquiryWorkflowService inquiries;
  private final TelegramLiveChatFlow flow;

  public TelegramLiveChatService(
      TelegramLiveChatRepository repository,
      TelegramLiveChatCredentialService credentials,
      TelegramLiveChatGateway gateway,
      InquiryWorkflowService inquiries,
      TelegramLiveChatFlow flow
  ) {
    this.repository = repository;
    this.credentials = credentials;
    this.gateway = gateway;
    this.inquiries = inquiries;
    this.flow = flow;
  }

  public WebhookResult handleWebhook(Map<String, Object> update, String providedSecret) {
    var configuration = credentials.authenticatedWebhook(providedSecret);
    if (configuration == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Telegram webhook secret");
    }
    if (!configuration.ready()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Telegram live chat is disabled");
    }
    var generation = configuration.settings().configurationGeneration();
    var rawUpdateId = update.get("update_id");
    var updateId = longValue(rawUpdateId);
    if (!validUpdateId(rawUpdateId, updateId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telegram update_id is required");
    }
    var claimToken = UUID.randomUUID().toString();
    var updateClaim = repository.claimUpdate(updateId, generation, claimToken);
    if (updateClaim == TelegramLiveChatRepository.UpdateClaim.COMPLETED) {
      return new WebhookResult("duplicate");
    }
    if (updateClaim == TelegramLiveChatRepository.UpdateClaim.IN_PROGRESS) {
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "This Telegram update is still being processed."
      );
    }

    try {
      WebhookResult result;
      var callback = object(update.get("callback_query"));
      if (!callback.isEmpty()) {
        result = handleCallback(callback, configuration);
      } else {
        var message = object(update.get("message"));
        if (message.isEmpty()) {
          result = new WebhookResult("ignored");
        } else {
          var chat = object(message.get("chat"));
          result = "private".equals(text(chat.get("type")))
              ? handlePrivateMessage(message, configuration)
              : handleTeamMessage(message, configuration);
        }
      }
      repository.completeUpdate(updateId, generation, claimToken);
      return result;
    } catch (TelegramLiveChatException error) {
      if (error.deliveryUncertain() && error.recoveryPersisted()) {
        repository.completeUpdate(updateId, generation, claimToken);
      } else {
        repository.releaseUpdate(updateId, generation, claimToken);
      }
      throw error;
    } catch (RuntimeException error) {
      repository.releaseUpdate(updateId, generation, claimToken);
      throw error;
    }
  }

  public TelegramLiveChatRepository.Session retryUncertainDelivery(String sessionId) {
    return retryUncertainDeliveryLocked(sessionId);
  }

  public TelegramLiveChatRepository.Session closeConversation(String sessionId) {
    var closed = repository.closeSession(sessionId);
    if (closed == null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This conversation is already closed or cannot be closed."
      );
    }
    try {
      var configuration = credentials.current();
      if (configuration.configured()
          && repository.sessionUsesGeneration(
              closed.id(), configuration.settings().configurationGeneration()
          )) {
        notifyCustomerClosed(configuration.botToken(), closed);
        return closeTeamTopic(configuration, closed);
      }
    } catch (RuntimeException error) {
      log.warn("Telegram live-chat was closed while the Bot configuration was unavailable.");
    }
    return markTopicCloseIssue(closed, "topic_close_failed");
  }

  private TelegramLiveChatRepository.Session retryUncertainDeliveryLocked(String sessionId) {
    var configuration = credentials.current();
    if (!configuration.configured()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Connect the live-chat Bot before retrying delivery."
      );
    }
    var session = repository.claimDeliveryRetry(sessionId);
    if (session == null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This delivery is already being recovered or is not ready for retry."
      );
    }
    var settings = configuration.settings();
    if ("registration_delivery_retrying".equals(session.attentionCode())) {
      if (session.inquiryId().isBlank() || session.topicThreadId() <= 0) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Delivery recovery data is incomplete.");
      }
      long rootMessageId;
      try {
        rootMessageId = gateway.sendMessage(
            configuration.botToken(),
            settings.targetChatId(),
            Long.toString(session.topicThreadId()),
            teamHeader(session),
            Map.of(),
            null
        );
      } catch (TelegramLiveChatException error) {
        restoreRetryAfterFailure(
            session, "registration_delivery_retrying", "registration_delivery_uncertain"
        );
        throw error;
      }
      try {
        return repository.activateAndRecordRoot(
            session.telegramChatId(),
            session.inquiryId(),
            rootMessageId,
            settings.configurationGeneration()
        );
      } catch (RuntimeException error) {
        try {
          repository.markNeedsAttention(
              session.telegramChatId(),
              "registration_mapping_pending",
              rootMessageId,
              settings.configurationGeneration()
          );
        } catch (RuntimeException recoveryError) {
          error.addSuppressed(recoveryError);
        }
        throw new TelegramLiveChatException(
            "The retried conversation was delivered but could not be recorded.", error, true, true
        );
      }
    } else if ("customer_delivery_retrying".equals(session.attentionCode())) {
      if (session.pendingCustomerMessageId() <= 0 || session.topicThreadId() <= 0) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Delivery recovery data is incomplete.");
      }
      if (repository.hasCustomerSourceMapping(session.id(), session.pendingCustomerMessageId())) {
        return repository.clearDeliveryIssue(session.id(), session.attentionCode());
      }
      long groupMessageId;
      try {
        groupMessageId = gateway.copyMessage(
            configuration.botToken(),
            settings.targetChatId(),
            Long.toString(session.telegramChatId()),
            session.pendingCustomerMessageId(),
            Long.toString(session.topicThreadId()),
            null
        );
      } catch (TelegramLiveChatException error) {
        restoreRetryAfterFailure(
            session, "customer_delivery_retrying", "customer_delivery_uncertain"
        );
        throw error;
      }
      try {
        repository.recordCustomerMessage(
            session.id(), session.pendingCustomerMessageId(), groupMessageId
        );
        return repository.clearDeliveryIssue(session.id(), session.attentionCode());
      } catch (RuntimeException error) {
        persistMappingRecovery(
            session,
            "customer_delivery_retrying",
            "customer_mapping_pending",
            session.pendingCustomerMessageId(),
            groupMessageId,
            "customer_to_team",
            error
        );
        throw new TelegramLiveChatException(
            "The retried customer message was delivered but could not be recorded.", error, true, true
        );
      }
    } else if ("team_delivery_retrying".equals(session.attentionCode())) {
      if (session.pendingGroupMessageId() <= 0) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Delivery recovery data is incomplete.");
      }
      if (repository.hasGroupSourceMapping(session.id(), session.pendingGroupMessageId())) {
        return repository.clearDeliveryIssue(session.id(), session.attentionCode());
      }
      long customerMessageId;
      try {
        customerMessageId = gateway.copyMessage(
            configuration.botToken(),
            Long.toString(session.telegramChatId()),
            settings.targetChatId(),
            session.pendingGroupMessageId(),
            "",
            null
        );
      } catch (TelegramLiveChatException error) {
        restoreRetryAfterFailure(
            session, "team_delivery_retrying", "team_delivery_uncertain"
        );
        throw error;
      }
      try {
        repository.recordTeamMessage(
            session.id(), session.pendingGroupMessageId(), customerMessageId
        );
        return repository.clearDeliveryIssue(session.id(), session.attentionCode());
      } catch (RuntimeException error) {
        persistMappingRecovery(
            session,
            "team_delivery_retrying",
            "team_mapping_pending",
            customerMessageId,
            session.pendingGroupMessageId(),
            "team_to_customer",
            error
        );
        throw new TelegramLiveChatException(
            "The retried team reply was delivered but could not be recorded.", error, true, true
        );
      }
    } else {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This live-chat record does not require a delivery retry."
      );
    }
  }

  private WebhookResult handleCallback(
      Map<String, Object> callback,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var callbackId = text(callback.get("id"));
    try {
      gateway.answerCallback(configuration.botToken(), callbackId);
    } catch (TelegramLiveChatException error) {
      log.warn("Telegram callback acknowledgement failed; continuing the consent workflow.");
    }
    var message = object(callback.get("message"));
    var chat = object(message.get("chat"));
    var from = object(callback.get("from"));
    var chatId = longValue(chat.get("id"));
    var userId = longValue(from.get("id"));
    if (chatId <= 0 || userId <= 0 || !"private".equals(text(chat.get("type")))) {
      return new WebhookResult("ignored");
    }
    var generation = configuration.settings().configurationGeneration();
    var session = repository.session(chatId, generation);
    rejectWhileRecoveryPending(session);
    var accepted = "live_consent_yes".equals(text(callback.get("data")));
    var decision = flow.decide(toFlowSession(session), TelegramLiveChatFlow.Input.consent(accepted));
    var saved = saveSession(chatId, userId, decision.session(), generation);
    if (decision.action() == TelegramLiveChatFlow.Action.ASK_NAME
        || (decision.action() == TelegramLiveChatFlow.Action.REPEAT_CURRENT_PROMPT
            && TelegramLiveChatFlow.AWAITING_NAME.equals(saved.state()))) {
      sendPrivate(configuration.botToken(), saved, message(saved.locale(), "name"), Map.of());
      return new WebhookResult("name_requested");
    }
    if (decision.action() == TelegramLiveChatFlow.Action.CONSENT_DECLINED) {
      sendPrivate(configuration.botToken(), saved, message(saved.locale(), "declined"), removeKeyboard());
      return new WebhookResult("consent_declined");
    }
    sendPrivate(configuration.botToken(), saved, message(saved.locale(), "restart"), removeKeyboard());
    return new WebhookResult("restart_required");
  }

  private WebhookResult handlePrivateMessage(
      Map<String, Object> message,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var chat = object(message.get("chat"));
    var from = object(message.get("from"));
    var chatId = longValue(chat.get("id"));
    var userId = longValue(from.get("id"));
    if (chatId <= 0 || userId <= 0 || booleanValue(from.get("is_bot"))) {
      return new WebhookResult("ignored");
    }
    var generation = configuration.settings().configurationGeneration();
    var existing = repository.session(chatId, generation);
    rejectWhileRecoveryPending(existing);
    var sourceMessageId = longValue(message.get("message_id"));
    if (existing != null
        && sourceMessageId > 0
        && repository.hasCustomerSourceMapping(existing.id(), sourceMessageId)) {
      return new WebhookResult("customer_message_duplicate");
    }
    var text = text(message.get("text"));
    TelegramLiveChatFlow.Input input;
    if (text.startsWith("/start")) {
      input = TelegramLiveChatFlow.Input.start(startLocale(text));
    } else {
      var contact = object(message.get("contact"));
      var sharedUserId = longValue(contact.get("user_id"));
      input = !contact.isEmpty() && (sharedUserId == 0 || sharedUserId == userId)
          ? TelegramLiveChatFlow.Input.sharedPhone(text(contact.get("phone_number")))
          : TelegramLiveChatFlow.Input.text(text);
    }
    var decision = flow.decide(toFlowSession(existing), input);
    if (existing == null
        && decision.action() == TelegramLiveChatFlow.Action.RESTART_REQUIRED) {
      gateway.sendMessage(
          configuration.botToken(),
          Long.toString(chatId),
          "",
          message("ko", "restart"),
          removeKeyboard(),
          null
      );
      return new WebhookResult("restart_required");
    }
    TelegramLiveChatRepository.Session saved;
    if (decision.action() == TelegramLiveChatFlow.Action.OPEN_CONVERSATION) {
      saved = repository.claimConversationOpen(
          chatId,
          userId,
          decision.session().locale(),
          decision.session().customerName(),
          decision.session().customerContact(),
          text,
          sourceMessageId,
          generation
      );
      if (saved == null) {
        return new WebhookResult("conversation_open_in_progress");
      }
    } else {
      saved = saveSession(chatId, userId, decision.session(), generation);
    }
    return applyPrivateDecision(message, saved, decision, configuration);
  }

  private WebhookResult applyPrivateDecision(
      Map<String, Object> sourceMessage,
      TelegramLiveChatRepository.Session session,
      TelegramLiveChatFlow.Decision decision,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var token = configuration.botToken();
    return switch (decision.action()) {
      case SHOW_CONSENT -> {
        sendPrivate(token, session, message(session.locale(), "consent"), consentKeyboard(session.locale()));
        yield new WebhookResult("consent_requested");
      }
      case ASK_NAME -> {
        sendPrivate(token, session, message(session.locale(), "name"), Map.of());
        yield new WebhookResult("name_requested");
      }
      case ASK_CONTACT -> {
        sendPrivate(token, session, message(session.locale(), "contact"), contactKeyboard(session.locale()));
        yield new WebhookResult("contact_requested");
      }
      case ASK_CONTENT -> {
        sendPrivate(token, session, message(session.locale(), "content"), removeKeyboard());
        yield new WebhookResult("content_requested");
      }
      case OPEN_CONVERSATION -> openConversation(session, configuration);
      case FORWARD_MESSAGE -> forwardCustomerMessage(sourceMessage, session, configuration);
      case ALREADY_ACTIVE -> {
        sendPrivate(token, session, message(session.locale(), "already_active"), removeKeyboard());
        yield new WebhookResult("already_active");
      }
      case INVALID_NAME -> {
        sendPrivate(token, session, message(session.locale(), "invalid_name"), Map.of());
        yield new WebhookResult("invalid_name");
      }
      case INVALID_CONTACT -> {
        sendPrivate(token, session, message(session.locale(), "invalid_contact"), contactKeyboard(session.locale()));
        yield new WebhookResult("invalid_contact");
      }
      case INVALID_CONTENT -> {
        sendPrivate(token, session, message(session.locale(), "invalid_content"), removeKeyboard());
        yield new WebhookResult("invalid_content");
      }
      default -> {
        sendPrivate(token, session, message(session.locale(), "restart"), removeKeyboard());
        yield new WebhookResult("restart_required");
      }
    };
  }

  private WebhookResult openConversation(
      TelegramLiveChatRepository.Session session,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    return openConversationLocked(session, configuration);
  }

  private WebhookResult openConversationLocked(
      TelegramLiveChatRepository.Session session,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var prepared = session;
    var inquiryId = text(prepared.inquiryId());
    var generation = configuration.settings().configurationGeneration();
    try {
      if (inquiryId.isBlank()) {
        var inquiry = inquiries.createTelegram(
            Map.of(
                "inquiryId", prepared.id(),
                "locale", prepared.locale(),
                "name", prepared.customerName(),
                "contact", prepared.customerContact(),
                "message", prepared.inquiryContent(),
                "telegramChatId", Long.toString(prepared.telegramChatId()),
                "telegramUserId", Long.toString(prepared.telegramUserId())
            ),
            Map.of("userAgent", "Telegram Bot")
        );
        inquiryId = text(inquiry.get("id"));
        prepared = repository.attachInquiry(prepared.telegramChatId(), inquiryId, generation);
      }
    } catch (RuntimeException error) {
      repository.resetConversationOpen(prepared.telegramChatId(), generation);
      throw error;
    }
    var settings = configuration.settings();
    if (prepared.topicThreadId() <= 0) {
      prepared = repository.reserveTopicCreation(prepared.id(), generation);
      if (prepared == null) {
        throw recoveryPending();
      }
      long topicThreadId;
      try {
        topicThreadId = gateway.createForumTopic(
            configuration.botToken(),
            settings.targetChatId(),
            topicTitle(prepared)
        );
      } catch (TelegramLiveChatException error) {
        repository.markNeedsAttention(
            prepared.telegramChatId(),
            error.deliveryUncertain() ? "topic_creation_uncertain" : "topic_creation_failed",
            0,
            generation
        );
        throw error.deliveryUncertain() ? trackedDelivery(error) : error;
      }
      prepared = repository.recordTopicThread(
          prepared.telegramChatId(), topicThreadId, generation
      );
    }
    long rootMessageId;
    try {
      rootMessageId = gateway.sendMessage(
          configuration.botToken(),
          settings.targetChatId(),
          Long.toString(prepared.topicThreadId()),
          teamHeader(prepared),
          Map.of(),
          null
      );
    } catch (TelegramLiveChatException error) {
      repository.markNeedsAttention(
          prepared.telegramChatId(),
          "registration_delivery_uncertain",
          0,
          generation
      );
      throw trackedDelivery(error);
    }
    TelegramLiveChatRepository.Session active;
    try {
      active = repository.activateAndRecordRoot(
          prepared.telegramChatId(), inquiryId, rootMessageId, generation
      );
    } catch (RuntimeException error) {
      try {
        repository.markNeedsAttention(
            prepared.telegramChatId(),
            "registration_mapping_pending",
            rootMessageId,
            generation
        );
      } catch (RuntimeException recoveryError) {
        error.addSuppressed(recoveryError);
      }
      throw new TelegramLiveChatException(
          "The team conversation was delivered but could not be recorded.",
          error,
          true,
          true
      );
    }
    try {
      sendPrivate(
          configuration.botToken(),
          active,
          message(active.locale(), "open"),
          removeKeyboard()
      );
    } catch (TelegramLiveChatException error) {
      log.warn("Telegram live-chat registration completed without a customer confirmation message.");
    }
    return new WebhookResult("conversation_opened");
  }

  private WebhookResult forwardCustomerMessage(
      Map<String, Object> message,
      TelegramLiveChatRepository.Session session,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    return forwardCustomerMessageLocked(message, session, configuration);
  }

  private WebhookResult forwardCustomerMessageLocked(
      Map<String, Object> message,
      TelegramLiveChatRepository.Session session,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var sourceMessageId = longValue(message.get("message_id"));
    if (sourceMessageId <= 0 || session.topicThreadId() <= 0) {
      return new WebhookResult("ignored");
    }
    if (repository.hasCustomerSourceMapping(session.id(), sourceMessageId)) {
      return new WebhookResult("customer_message_duplicate");
    }
    var reservationCode = "customer_delivery_in_flight";
    var settings = configuration.settings();
    if (repository.reserveDelivery(
        session.id(),
        reservationCode,
        sourceMessageId,
        0,
        settings.configurationGeneration()
    ) == null) {
      throw recoveryPending();
    }
    long groupMessageId;
    try {
      groupMessageId = gateway.copyMessage(
          configuration.botToken(),
          settings.targetChatId(),
          Long.toString(session.telegramChatId()),
          sourceMessageId,
          Long.toString(session.topicThreadId()),
          null
      );
    } catch (TelegramLiveChatException error) {
      repository.transitionDeliveryIssue(
          session.id(),
          reservationCode,
          error.deliveryUncertain() ? "customer_delivery_uncertain" : "",
          error.deliveryUncertain() ? sourceMessageId : 0,
          0,
          ""
      );
      if (error.deliveryUncertain()) {
        throw trackedDelivery(error);
      }
      throw error;
    }
    try {
      repository.recordCustomerMessage(session.id(), sourceMessageId, groupMessageId);
      repository.clearDeliveryIssue(session.id(), reservationCode);
    } catch (RuntimeException error) {
      persistMappingRecovery(
          session,
          reservationCode,
          "customer_mapping_pending",
          sourceMessageId,
          groupMessageId,
          "customer_to_team",
          error
      );
      throw new TelegramLiveChatException(
          "The customer message was delivered but could not be recorded.",
          error,
          true,
          true
      );
    }
    return new WebhookResult("customer_message_forwarded");
  }

  private WebhookResult handleTeamMessage(
      Map<String, Object> message,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var settings = configuration.settings();
    var chat = object(message.get("chat"));
    var from = object(message.get("from"));
    if (!settings.targetChatId().equals(text(chat.get("id")))
        || booleanValue(from.get("is_bot"))) {
      return new WebhookResult("ignored");
    }
    var topicThreadId = longValue(message.get("message_thread_id"));
    var groupMessageId = longValue(message.get("message_id"));
    var session = repository.sessionForThread(
        topicThreadId,
        settings.configurationGeneration(),
        settings.targetChatId()
    );
    if (session == null || groupMessageId <= 0) {
      return new WebhookResult("ignored");
    }
    rejectWhileRecoveryPending(session);
    if (isCloseCommand(text(message.get("text")), settings.botUsername())) {
      var closed = repository.closeSession(session.id(), settings.configurationGeneration());
      if (closed == null) {
        return new WebhookResult("conversation_already_closed");
      }
      notifyCustomerClosed(configuration.botToken(), closed);
      closeTeamTopic(configuration, closed);
      return new WebhookResult("conversation_closed");
    }
    if (repository.hasGroupSourceMapping(session.id(), groupMessageId)) {
      return new WebhookResult("team_message_duplicate");
    }
    return forwardTeamMessageLocked(message, session, groupMessageId, configuration);
  }

  private WebhookResult forwardTeamMessageLocked(
      Map<String, Object> message,
      TelegramLiveChatRepository.Session session,
      long groupMessageId,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var settings = configuration.settings();
    var reservationCode = "team_delivery_in_flight";
    if (repository.reserveDelivery(
        session.id(),
        reservationCode,
        0,
        groupMessageId,
        settings.configurationGeneration()
    ) == null) {
      throw recoveryPending();
    }
    long customerMessageId;
    try {
      customerMessageId = gateway.copyMessage(
          configuration.botToken(),
          Long.toString(session.telegramChatId()),
          settings.targetChatId(),
          groupMessageId,
          "",
          null
      );
    } catch (TelegramLiveChatException error) {
      repository.transitionDeliveryIssue(
          session.id(),
          reservationCode,
          error.deliveryUncertain() ? "team_delivery_uncertain" : "",
          0,
          error.deliveryUncertain() ? groupMessageId : 0,
          ""
      );
      if (error.deliveryUncertain()) {
        throw trackedDelivery(error);
      }
      throw error;
    }
    try {
      repository.recordTeamMessage(session.id(), groupMessageId, customerMessageId);
      repository.clearDeliveryIssue(session.id(), reservationCode);
    } catch (RuntimeException error) {
      persistMappingRecovery(
          session,
          reservationCode,
          "team_mapping_pending",
          customerMessageId,
          groupMessageId,
          "team_to_customer",
          error
      );
      throw new TelegramLiveChatException(
          "The team reply was delivered but could not be recorded.",
          error,
          true,
          true
      );
    }
    return new WebhookResult("team_reply_forwarded");
  }

  private TelegramLiveChatException trackedDelivery(TelegramLiveChatException error) {
    return new TelegramLiveChatException(
        error.getMessage(),
        error,
        true,
        true
    );
  }

  private void notifyCustomerClosed(
      String botToken,
      TelegramLiveChatRepository.Session session
  ) {
    try {
      sendPrivate(botToken, session, message(session.locale(), "closed"), removeKeyboard());
    } catch (TelegramLiveChatException error) {
      log.warn("Telegram live-chat was closed without a customer confirmation message.");
    }
  }

  private TelegramLiveChatRepository.Session closeTeamTopic(
      TelegramLiveChatCredentialService.Credentials configuration,
      TelegramLiveChatRepository.Session closed
  ) {
    if (closed.topicThreadId() <= 0) {
      return closed;
    }
    try {
      gateway.closeForumTopic(
          configuration.botToken(),
          configuration.settings().targetChatId(),
          closed.topicThreadId()
      );
      var cleared = repository.clearDeliveryIssue(closed.id(), "topic_close_in_flight");
      return cleared == null ? closed : cleared;
    } catch (TelegramLiveChatException error) {
      log.warn("Telegram live-chat closed in CMS but its group Topic still needs closure.");
      return markTopicCloseIssue(
          closed,
          error.deliveryUncertain() ? "topic_close_uncertain" : "topic_close_failed"
      );
    }
  }

  private TelegramLiveChatRepository.Session markTopicCloseIssue(
      TelegramLiveChatRepository.Session closed,
      String attentionCode
  ) {
    var marked = repository.markTopicCloseIssue(closed.id(), attentionCode);
    return marked == null ? closed : marked;
  }

  private boolean isCloseCommand(String value, String botUsername) {
    var normalized = text(value).toLowerCase(java.util.Locale.ROOT);
    return "/close".equals(normalized)
        || ("/close@" + text(botUsername).toLowerCase(java.util.Locale.ROOT)).equals(normalized);
  }

  private TelegramLiveChatRepository.Session saveSession(
      long chatId,
      long userId,
      TelegramLiveChatFlow.Session session,
      long expectedGeneration
  ) {
    return repository.saveSession(
        chatId,
        userId,
        session.state(),
        session.locale(),
        session.customerName(),
        session.customerContact(),
        expectedGeneration
    );
  }

  private void persistMappingRecovery(
      TelegramLiveChatRepository.Session session,
      String expectedAttentionCode,
      String nextAttentionCode,
      long customerMessageId,
      long groupMessageId,
      String direction,
      RuntimeException originalError
  ) {
    try {
      repository.transitionDeliveryIssue(
          session.id(),
          expectedAttentionCode,
          nextAttentionCode,
          customerMessageId,
          groupMessageId,
          direction
      );
    } catch (RuntimeException recoveryError) {
      originalError.addSuppressed(recoveryError);
    }
  }

  private void restoreRetryAfterFailure(
      TelegramLiveChatRepository.Session session,
      String expectedAttentionCode,
      String nextAttentionCode
  ) {
    repository.transitionDeliveryIssue(
        session.id(),
        expectedAttentionCode,
        nextAttentionCode,
        session.pendingCustomerMessageId(),
        session.pendingGroupMessageId(),
        ""
    );
  }

  private void rejectWhileRecoveryPending(TelegramLiveChatRepository.Session session) {
    if (session != null && !session.attentionCode().isBlank()) {
      throw recoveryPending();
    }
  }

  private ResponseStatusException recoveryPending() {
    return new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "This live-chat conversation is waiting for delivery recovery."
    );
  }

  private TelegramLiveChatFlow.Session toFlowSession(TelegramLiveChatRepository.Session session) {
    return session == null
        ? TelegramLiveChatFlow.Session.empty()
        : new TelegramLiveChatFlow.Session(
            session.state(),
            session.locale(),
            session.customerName(),
            session.customerContact()
        );
  }

  private void sendPrivate(
      String token,
      TelegramLiveChatRepository.Session session,
      String body,
      Map<String, Object> keyboard
  ) {
    gateway.sendMessage(
        token,
        Long.toString(session.telegramChatId()),
        "",
        body,
        keyboard,
        null
    );
  }

  private Map<String, Object> consentKeyboard(String locale) {
    return Map.of("inline_keyboard", List.of(List.of(
        Map.of("text", "en".equals(locale) ? "Agree" : "동의", "callback_data", "live_consent_yes"),
        Map.of("text", "en".equals(locale) ? "Decline" : "거절", "callback_data", "live_consent_no")
    )));
  }

  private Map<String, Object> contactKeyboard(String locale) {
    return Map.of(
        "keyboard", List.of(List.of(Map.of(
            "text", "en".equals(locale) ? "Share my phone number" : "휴대전화 번호 공유",
            "request_contact", true
        ))),
        "resize_keyboard", true,
        "one_time_keyboard", true
    );
  }

  private Map<String, Object> removeKeyboard() {
    return Map.of("remove_keyboard", true);
  }

  private String teamHeader(TelegramLiveChatRepository.Session session) {
    return """
        🔔 새 실시간 상담

        이름: %s
        연락처: %s
        문의 내용:
        %s
        """.formatted(
        session.customerName(),
        session.customerContact(),
        session.inquiryContent()
    ).trim();
  }

  private String topicTitle(TelegramLiveChatRepository.Session session) {
    var title = "문의 · " + session.customerName();
    return title.length() <= 120 ? title : title.substring(0, 120);
  }

  private String message(String locale, String key) {
    var english = "en".equals(locale);
    return switch (key) {
      case "consent" -> english
          ? "Before the live consultation, we need your name and contact details. They will be used only to manage your inquiry. Do you agree?"
          : "실시간 상담 전에 성함과 연락처가 필요합니다. 입력하신 정보는 문의 상담을 위해서만 사용됩니다. 동의하시나요?";
      case "name" -> english ? "Please enter your name." : "성함을 입력해 주세요.";
      case "contact" -> english
          ? "Share your Telegram phone number below, or type a phone number or email address."
          : "아래 버튼으로 휴대전화 번호를 공유하거나 전화번호 또는 이메일을 직접 입력해 주세요.";
      case "content" -> english
          ? "Please enter the details of your inquiry."
          : "상담받으실 문의 내용을 입력해 주세요.";
      case "open" -> english
          ? "Registration is complete. Send your question here and our team will reply in this chat."
          : "문의 등록이 완료되었습니다. 궁금하신 내용을 보내주시면 담당자가 이 채팅으로 답변드립니다.";
      case "already_active" -> english
          ? "Your live consultation is already connected. Please send your question."
          : "실시간 상담이 이미 연결되어 있습니다. 문의 내용을 보내 주세요.";
      case "closed" -> english
          ? "This consultation has ended. Send /start whenever you need a new consultation."
          : "상담이 종료되었습니다. 새 상담이 필요하시면 /start를 보내 주세요.";
      case "declined" -> english
          ? "Registration was cancelled. Send /start whenever you want to begin again."
          : "문의 등록이 취소되었습니다. 다시 시작하려면 /start를 보내 주세요.";
      case "invalid_name" -> english
          ? "Please enter a name between 2 and 80 characters."
          : "성함을 2자 이상 80자 이하로 입력해 주세요.";
      case "invalid_contact" -> english
          ? "Enter a valid phone number or email address."
          : "올바른 전화번호 또는 이메일을 입력해 주세요.";
      case "invalid_content" -> english
          ? "Please enter your inquiry in 2,000 characters or fewer."
          : "문의 내용을 2,000자 이하로 입력해 주세요.";
      default -> english
          ? "Send /start to begin a live consultation."
          : "실시간 상담을 시작하려면 /start를 보내 주세요.";
    };
  }

  private String startLocale(String text) {
    return text.toLowerCase(java.util.Locale.ROOT).contains("site_en") ? "en" : "ko";
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> object(Object value) {
    return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
  }

  private boolean booleanValue(Object value) {
    return value instanceof Boolean bool && bool;
  }

  private long longValue(Object value) {
    if (value instanceof Number number) {
      return number.longValue();
    }
    try {
      return Long.parseLong(text(value));
    } catch (NumberFormatException error) {
      return 0;
    }
  }

  private boolean validUpdateId(Object value, long parsed) {
    var normalized = text(value);
    return parsed >= 0
        && normalized.matches("^(0|[1-9][0-9]{0,18})$")
        && Long.toString(parsed).equals(normalized);
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  public record WebhookResult(String status) {}
}
