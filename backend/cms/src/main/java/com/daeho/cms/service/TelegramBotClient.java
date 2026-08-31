package com.daeho.cms.service;

import com.daeho.cms.config.NotificationProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TelegramBotClient {
  private final NotificationProperties properties;
  private final TelegramCredentialService credentials;
  private final JsonSupport json;
  private final HttpClient client;
  private final boolean allowLoopbackEndpoint;

  @Autowired
  public TelegramBotClient(
      NotificationProperties properties,
      TelegramCredentialService credentials,
      JsonSupport json
  ) {
    this(
        properties,
        credentials,
        json,
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build(),
        false
    );
  }

  TelegramBotClient(
      NotificationProperties properties,
      TelegramCredentialService credentials,
      JsonSupport json,
      HttpClient client
  ) {
    this(properties, credentials, json, client, true);
  }

  private TelegramBotClient(
      NotificationProperties properties,
      TelegramCredentialService credentials,
      JsonSupport json,
      HttpClient client,
      boolean allowLoopbackEndpoint
  ) {
    this.properties = properties;
    this.credentials = credentials;
    this.json = json;
    this.client = client;
    this.allowLoopbackEndpoint = allowLoopbackEndpoint;
  }

  public SendResult send(Map<String, Object> job) {
    var configuration = credentials.current();
    if (!configuration.configured() || !trustedEndpoint()) {
      return SendResult.failed("Telegram Bot credentials or group Chat ID are not configured.");
    }
    var recipient = text(job.get("recipient"));
    if (recipient.isBlank()) {
      return SendResult.failed("Telegram group Chat ID is not configured.");
    }
    var body = text(job.get("renderedBody"));
    if (body.isBlank()) {
      return SendResult.failed("Telegram message body is empty.");
    }
    try {
      var response = client.send(
          request(configuration.botToken(), json.stringify(Map.of("chat_id", recipient, "text", body))),
          HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      var payload = json.objectOrEmpty(response.body());
      if (response.statusCode() < 200 || response.statusCode() >= 300
          || !booleanValue(payload.get("ok"))) {
        return SendResult.failed(firstNonBlank(
            payload.get("description"),
            "Telegram Bot API request failed with HTTP " + response.statusCode() + "."
        ));
      }
      if (!(payload.get("result") instanceof Map<?, ?> result)) {
        return SendResult.uncertain("Telegram accepted the request but did not return a message result.");
      }
      var messageId = text(result.get("message_id"));
      return messageId.isBlank()
          ? SendResult.uncertain("Telegram accepted the request but did not return a message ID.")
          : SendResult.sent(messageId);
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      return SendResult.uncertain("The Telegram request was interrupted and its result is unknown.");
    } catch (Exception error) {
      if (requestDefinitelyNotSent(error)) {
        return SendResult.failed("Unable to connect to the Telegram Bot API.");
      }
      return SendResult.uncertain("The Telegram response was not received; the send result is unknown.");
    }
  }

  public boolean configured() {
    return credentials.current().configured() && trustedEndpoint();
  }

  public String configuredChatId() {
    return text(credentials.current().chatId());
  }

  private HttpRequest request(String botToken, String body) {
    return HttpRequest.newBuilder()
        .uri(URI.create(
            properties.normalizedTelegramApiBaseUrl()
                + "/bot"
                + text(botToken)
                + "/sendMessage"
        ))
        .timeout(Duration.ofSeconds(12))
        .header("content-type", "application/json; charset=utf-8")
        .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
        .build();
  }

  private boolean trustedEndpoint() {
    try {
      var endpoint = URI.create(properties.normalizedTelegramApiBaseUrl());
      var host = text(endpoint.getHost()).toLowerCase(java.util.Locale.ROOT);
      if ("https".equalsIgnoreCase(endpoint.getScheme()) && "api.telegram.org".equals(host)) {
        return true;
      }
      return allowLoopbackEndpoint
          && "http".equalsIgnoreCase(endpoint.getScheme())
          && ("127.0.0.1".equals(host) || "localhost".equals(host));
    } catch (IllegalArgumentException error) {
      return false;
    }
  }

  private boolean requestDefinitelyNotSent(Throwable error) {
    for (var cause = error; cause != null; cause = cause.getCause()) {
      if (cause instanceof java.net.ConnectException
          || cause instanceof java.net.http.HttpConnectTimeoutException
          || cause instanceof java.nio.channels.UnresolvedAddressException) {
        return true;
      }
    }
    return false;
  }

  private boolean booleanValue(Object value) {
    return value instanceof Boolean bool && bool;
  }

  private String firstNonBlank(Object... values) {
    for (var value : values) {
      var text = text(value);
      if (!text.isBlank()) {
        return text;
      }
    }
    return "";
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  public record SendResult(boolean success, boolean uncertain, String messageId, String errorMessage) {
    public static SendResult sent(String messageId) {
      return new SendResult(true, false, messageId, "");
    }

    public static SendResult failed(String errorMessage) {
      return new SendResult(false, false, "", errorMessage);
    }

    public static SendResult uncertain(String errorMessage) {
      return new SendResult(false, true, "", errorMessage);
    }
  }
}
