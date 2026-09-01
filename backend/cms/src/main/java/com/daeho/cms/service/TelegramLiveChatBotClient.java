package com.daeho.cms.service;

import com.daeho.cms.config.NotificationProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class TelegramLiveChatBotClient implements TelegramLiveChatGateway {
  private final NotificationProperties properties;
  private final JsonSupport json;
  private final HttpClient client;

  public TelegramLiveChatBotClient(NotificationProperties properties, JsonSupport json) {
    this.properties = properties;
    this.json = json;
    this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
  }

  @Override
  public BotIdentity getMe(String botToken) {
    var result = call(botToken, "getMe", Map.of());
    var username = text(result.get("username"));
    if (username.isBlank()) {
      throw new TelegramLiveChatException("Telegram did not return the Bot username.");
    }
    return new BotIdentity(
        positiveLong(result.get("id"), "Telegram did not return the Bot ID."),
        username,
        result.get("can_read_all_group_messages") instanceof Boolean enabled && enabled
    );
  }

  @Override
  public void verifyForumAccess(String botToken, String targetChatId, long botUserId) {
    var chat = call(botToken, "getChat", Map.of("chat_id", targetChatId));
    if (!"supergroup".equals(text(chat.get("type")))
        || !(chat.get("is_forum") instanceof Boolean forum && forum)) {
      throw new TelegramLiveChatException(
          "The live-chat target must be a Telegram forum supergroup."
      );
    }
    var member = call(botToken, "getChatMember", Map.of(
        "chat_id", targetChatId,
        "user_id", botUserId
    ));
    if (!"administrator".equals(text(member.get("status")))
        || !(member.get("can_manage_topics") instanceof Boolean allowed && allowed)) {
      throw new TelegramLiveChatException(
          "Make the live-chat Bot a group administrator with Manage Topics permission."
      );
    }
  }

  @Override
  public long createForumTopic(String botToken, String targetChatId, String topicName) {
    var result = call(botToken, "createForumTopic", Map.of(
        "chat_id", targetChatId,
        "name", topicName
    ));
    return requiredLong(result, "message_thread_id", "Telegram did not return the new Topic ID.");
  }

  @Override
  public void setWebhook(String botToken, String webhookUrl, String secretToken) {
    call(botToken, "setWebhook", webhookPayload(webhookUrl, secretToken));
  }

  Map<String, Object> webhookPayload(String webhookUrl, String secretToken) {
    return Map.of(
        "url", webhookUrl,
        "secret_token", secretToken,
        "allowed_updates", java.util.List.of("message", "callback_query")
    );
  }

  @Override
  public long sendMessage(
      String botToken,
      String targetChatId,
      String messageThreadId,
      String text,
      Map<String, Object> replyMarkup,
      Long replyToMessageId
  ) {
    var payload = new LinkedHashMap<String, Object>();
    payload.put("chat_id", targetChatId);
    payload.put("text", text);
    payload.put("disable_web_page_preview", true);
    if (!text(messageThreadId).isBlank()) {
      payload.put("message_thread_id", Long.parseLong(messageThreadId));
    }
    if (replyMarkup != null && !replyMarkup.isEmpty()) {
      payload.put("reply_markup", replyMarkup);
    }
    if (replyToMessageId != null && replyToMessageId > 0) {
      payload.put("reply_parameters", Map.of("message_id", replyToMessageId));
    }
    return requiredLong(
        call(botToken, "sendMessage", payload),
        "message_id",
        "Telegram did not return the sent message ID."
    );
  }

  @Override
  public long copyMessage(
      String botToken,
      String targetChatId,
      String sourceChatId,
      long sourceMessageId,
      String messageThreadId,
      Long replyToMessageId
  ) {
    var payload = new LinkedHashMap<String, Object>();
    payload.put("chat_id", targetChatId);
    payload.put("from_chat_id", sourceChatId);
    payload.put("message_id", sourceMessageId);
    if (!text(messageThreadId).isBlank()) {
      payload.put("message_thread_id", Long.parseLong(messageThreadId));
    }
    if (replyToMessageId != null && replyToMessageId > 0) {
      payload.put("reply_parameters", Map.of("message_id", replyToMessageId));
    }
    return requiredLong(
        call(botToken, "copyMessage", payload),
        "message_id",
        "Telegram did not return the copied message ID."
    );
  }

  @Override
  public void answerCallback(String botToken, String callbackQueryId) {
    if (!text(callbackQueryId).isBlank()) {
      call(botToken, "answerCallbackQuery", Map.of("callback_query_id", callbackQueryId));
    }
  }

  @Override
  public void closeForumTopic(String botToken, String targetChatId, long messageThreadId) {
    if (messageThreadId > 0) {
      call(botToken, "closeForumTopic", Map.of(
          "chat_id", targetChatId,
          "message_thread_id", messageThreadId
      ));
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> call(String botToken, String method, Map<String, Object> payload) {
    if (!trustedEndpoint()) {
      throw new TelegramLiveChatException("Telegram Bot API endpoint is not trusted.");
    }
    var normalizedToken = text(botToken);
    if (!normalizedToken.matches("^[0-9]{5,20}:[A-Za-z0-9_-]{20,128}$")) {
      throw new TelegramLiveChatException("The live-chat Bot token is invalid.");
    }
    try {
      var request = HttpRequest.newBuilder()
          .uri(URI.create(
              properties.normalizedTelegramApiBaseUrl()
                  + "/bot"
                  + normalizedToken
                  + "/"
                  + method
          ))
          .timeout(Duration.ofSeconds(15))
          .header("content-type", "application/json; charset=utf-8")
          .POST(HttpRequest.BodyPublishers.ofString(json.stringify(payload), StandardCharsets.UTF_8))
          .build();
      var response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      var body = json.objectOrEmpty(response.body());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        var description = text(body.get("description"));
        throw new TelegramLiveChatException(
            description.isBlank() ? "Telegram Bot API request failed." : description,
            responseFailureUncertain(method, response.statusCode())
        );
      }
      var acknowledged = body.get("ok");
      if (acknowledged instanceof Boolean ok && !ok) {
        var description = text(body.get("description"));
        throw new TelegramLiveChatException(
            description.isBlank() ? "Telegram Bot API request failed." : description
        );
      }
      if (!(acknowledged instanceof Boolean ok) || !ok) {
        throw new TelegramLiveChatException(
            "Telegram returned an incomplete success response.",
            mutationMayHaveStarted(method)
        );
      }
      if (!(body.get("result") instanceof Map<?, ?> result)) {
        return Map.of();
      }
      return (Map<String, Object>) result;
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new TelegramLiveChatException(
          "Telegram Bot API request was interrupted after dispatch may have started.",
          error,
          true
      );
    } catch (java.io.IOException error) {
      var deliveryUncertain = !requestDefinitelyNotSent(error);
      throw new TelegramLiveChatException(
          deliveryUncertain
              ? "Telegram Bot API delivery outcome is unknown."
              : "Unable to connect to the Telegram Bot API.",
          error,
          deliveryUncertain
      );
    } catch (TelegramLiveChatException error) {
      throw error;
    } catch (Exception error) {
      throw new TelegramLiveChatException("Unable to connect to the Telegram Bot API.", error);
    }
  }

  boolean requestDefinitelyNotSent(Throwable error) {
    for (var cause = error; cause != null; cause = cause.getCause()) {
      if (cause instanceof java.net.ConnectException
          || cause instanceof java.net.http.HttpConnectTimeoutException
          || cause instanceof java.nio.channels.UnresolvedAddressException
          || cause instanceof javax.net.ssl.SSLHandshakeException) {
        return true;
      }
    }
    return false;
  }

  long requiredLong(Map<String, Object> payload, String key, String errorMessage) {
    var value = payload.get(key);
    if (value instanceof Number number && number.longValue() > 0) {
      return number.longValue();
    }
    try {
      var parsed = Long.parseLong(text(value));
      if (parsed > 0) {
        return parsed;
      }
    } catch (NumberFormatException ignored) {
      // Fall through to the safe provider error below.
    }
    throw new TelegramLiveChatException(errorMessage, true);
  }

  private long positiveLong(Object value, String errorMessage) {
    if (value instanceof Number number && number.longValue() > 0) {
      return number.longValue();
    }
    try {
      var parsed = Long.parseLong(text(value));
      if (parsed > 0) {
        return parsed;
      }
    } catch (NumberFormatException ignored) {
      // Fall through to the provider response error below.
    }
    throw new TelegramLiveChatException(errorMessage);
  }

  private boolean mutationMayHaveStarted(String method) {
    return !java.util.Set.of("getMe", "getChat", "getChatMember").contains(method);
  }

  boolean responseFailureUncertain(String method, int statusCode) {
    return statusCode >= 500 && mutationMayHaveStarted(method);
  }

  private boolean trustedEndpoint() {
    try {
      var endpoint = URI.create(properties.normalizedTelegramApiBaseUrl());
      var path = text(endpoint.getRawPath());
      return "https".equalsIgnoreCase(endpoint.getScheme())
          && "api.telegram.org".equalsIgnoreCase(text(endpoint.getHost()))
          && endpoint.getPort() == -1
          && endpoint.getRawUserInfo() == null
          && (path.isBlank() || "/".equals(path))
          && endpoint.getRawQuery() == null
          && endpoint.getRawFragment() == null;
    } catch (IllegalArgumentException error) {
      return false;
    }
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }
}
