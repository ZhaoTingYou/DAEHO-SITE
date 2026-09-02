package com.daeho.cms.service;

import com.daeho.cms.config.TelegramLiveChatProperties;
import com.daeho.cms.repository.WebLiveChatRepository;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class WebLiveChatTelegramBridge {
  private static final Logger log = LoggerFactory.getLogger(WebLiveChatTelegramBridge.class);
  private static final String CLOSED_MESSAGE = "상담이 종료되었습니다.";
  private final WebLiveChatRepository repository;
  private final WebLiveChatEventBroker broker;
  private final TelegramLiveChatGateway gateway;
  private final TelegramLiveChatProperties properties;

  public WebLiveChatTelegramBridge(
      WebLiveChatRepository repository,
      WebLiveChatEventBroker broker,
      TelegramLiveChatGateway gateway,
      TelegramLiveChatProperties properties
  ) {
    this.repository = repository;
    this.broker = broker;
    this.gateway = gateway;
    this.properties = properties;
  }

  public Optional<TelegramLiveChatService.WebhookResult> handleTeamMessage(
      Map<String, Object> message,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var topicThreadId = longValue(message.get("message_thread_id"));
    if (topicThreadId <= 0) {
      return Optional.empty();
    }
    var settings = configuration.settings();
    var conversation = repository.conversationForTopic(
        settings.configurationGeneration(), settings.targetChatId(), topicThreadId
    );
    if (conversation == null) {
      return Optional.empty();
    }
    if (message.containsKey("forum_topic_closed")) {
      return Optional.of(close(conversation, configuration, false));
    }
    var telegramMessageId = longValue(message.get("message_id"));
    var body = text(message.get("text"));
    if (telegramMessageId <= 0 || !message.containsKey("text") || body.isBlank()) {
      return Optional.of(new TelegramLiveChatService.WebhookResult("web_message_ignored"));
    }
    if (matchesCommand(body, "note", settings.botUsername())) {
      return Optional.of(
          new TelegramLiveChatService.WebhookResult("web_internal_note_ignored")
      );
    }
    if (matchesCommand(body, "close", settings.botUsername())) {
      return Optional.of(close(conversation, configuration, true));
    }
    var persisted = repository.recordTeamMessage(
        conversation.id(), telegramMessageId, body
    );
    if (persisted != null) {
      broker.publish(conversation.id(), persisted);
      return Optional.of(
          new TelegramLiveChatService.WebhookResult("web_team_reply_recorded")
      );
    }
    return Optional.of(new TelegramLiveChatService.WebhookResult("web_team_reply_duplicate"));
  }

  public Optional<TelegramLiveChatService.WebhookResult> handlePrivateMessage(
      Map<String, Object> message,
      TelegramLiveChatCredentialService.Credentials configuration
  ) {
    var chat = object(message.get("chat"));
    var chatId = longValue(chat.get("id"));
    if (chatId <= 0) {
      return Optional.empty();
    }
    var english = text(message.get("text")).toLowerCase(Locale.ROOT).contains("site_en");
    var body = (english
        ? "Live consultation is available on the DAEHO website:"
        : "실시간 상담은 DAEHO 웹사이트에서 이용해 주세요.")
        + "\n" + properties.normalizedPublicSiteUrl();
    gateway.sendMessage(
        configuration.botToken(),
        Long.toString(chatId),
        "",
        body,
        Map.of("remove_keyboard", true),
        null
    );
    return Optional.of(
        new TelegramLiveChatService.WebhookResult("web_private_redirect_sent")
    );
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

  @SuppressWarnings("unchecked")
  private Map<String, Object> object(Object value) {
    return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  private TelegramLiveChatService.WebhookResult close(
      WebLiveChatRepository.Conversation conversation,
      TelegramLiveChatCredentialService.Credentials configuration,
      boolean closeTopic
  ) {
    var closed = repository.close(conversation.id(), CLOSED_MESSAGE);
    if (closed == null) {
      return new TelegramLiveChatService.WebhookResult("web_conversation_already_closed");
    }
    broker.publish(conversation.id(), closed.event());
    if (!closeTopic && conversation.topicThreadId() > 0) {
      repository.completeTopicClose(conversation.id());
    } else if (conversation.topicThreadId() > 0) {
      try {
        gateway.closeForumTopic(
            configuration.botToken(),
            configuration.settings().targetChatId(),
            conversation.topicThreadId()
        );
        repository.completeTopicClose(conversation.id());
      } catch (TelegramLiveChatException error) {
        repository.markTopicCloseNeedsAttention(
            conversation.id(), error.deliveryUncertain() ? "topic_close_uncertain" : "topic_close_failed"
        );
        log.warn("Web live-chat closed while its Telegram Topic still needs closure.");
      } catch (RuntimeException error) {
        repository.markTopicCloseNeedsAttention(conversation.id(), "topic_close_unavailable");
        log.warn("Web live-chat closed while its Telegram Topic still needs closure.");
      }
    }
    return new TelegramLiveChatService.WebhookResult("web_conversation_closed");
  }

  private boolean matchesCommand(String body, String command, String botUsername) {
    var firstToken = body.split("\\s+", 2)[0].toLowerCase(Locale.ROOT);
    return ("/" + command).equals(firstToken)
        || ("/" + command + "@" + text(botUsername).toLowerCase(Locale.ROOT))
            .equals(firstToken);
  }
}
