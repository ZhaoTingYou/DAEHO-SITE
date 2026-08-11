package com.daeho.cms.service;

import com.daeho.cms.config.NotificationProperties;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SolapiKakaoClient {
  private static final String SEND_PATH = "/messages/v4/send-many/detail";
  private static final String LIST_PATH = "/messages/v4/list";

  private final NotificationProperties properties;
  private final JsonSupport json;
  private final HttpClient client;
  private final Clock clock;
  private final Supplier<String> saltSupplier;

  @Autowired
  public SolapiKakaoClient(NotificationProperties properties, JsonSupport json) {
    this(
        properties,
        json,
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build(),
        Clock.systemUTC(),
        () -> UUID.randomUUID().toString().replace("-", "")
    );
  }

  SolapiKakaoClient(
      NotificationProperties properties,
      JsonSupport json,
      HttpClient client,
      Clock clock,
      Supplier<String> saltSupplier
  ) {
    this.properties = properties;
    this.json = json;
    this.client = client;
    this.clock = clock;
    this.saltSupplier = saltSupplier;
  }

  public SendResult send(Map<String, Object> job) {
    if (!properties.kakaoConfigured()) {
      return SendResult.failed("SOLAPI Kakao credentials are not configured.");
    }
    if (text(job.get("providerTemplateCode")).isBlank()) {
      return SendResult.failed("An approved SOLAPI Kakao template ID is not configured.");
    }
    try {
      var response = client.send(
          request("POST", SEND_PATH, requestBody(job)),
          HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      var payload = json.objectOrEmpty(response.body());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        return SendResult.failed(providerError(payload, response.statusCode()));
      }
      var failures = payload.get("failedMessageList") instanceof List<?> list ? list : List.of();
      if (!failures.isEmpty()) {
        return SendResult.failed(messageError(failures.get(0), "SOLAPI rejected the Kakao message."));
      }
      var messages = payload.get("messageList") instanceof List<?> list ? list : List.of();
      if (messages.isEmpty() || !(messages.get(0) instanceof Map<?, ?> rawMessage)) {
        return SendResult.failed("SOLAPI did not return a Kakao message result.");
      }
      var message = stringMap(rawMessage);
      var statusCode = text(message.get("statusCode"));
      if (!(statusCode.startsWith("2") || statusCode.startsWith("3"))) {
        return SendResult.failed(firstNonBlank(
            message.get("statusMessage"),
            message.get("reason"),
            "SOLAPI rejected the Kakao message with status " + statusCode + "."
        ));
      }
      var messageId = text(message.get("messageId"));
      return messageId.isBlank()
          ? SendResult.failed("SOLAPI did not return a Kakao message ID.")
          : SendResult.accepted(messageId);
    } catch (Exception error) {
      return SendResult.failed(error.getMessage() == null ? "Unknown SOLAPI Kakao error." : error.getMessage());
    }
  }

  String requestBody(Map<String, Object> job) {
    return json.stringify(Map.of(
        "messages", List.of(Map.of(
            "to", text(job.get("recipient")),
            "text", text(job.get("renderedBody")),
            "kakaoOptions", Map.of(
                "pfId", text(properties.solapiPfId()),
                "templateId", text(job.get("providerTemplateCode")),
                "disableSms", true
            )
        )),
        "showMessageList", true,
        "strict", true,
        "allowDuplicates", false
    ));
  }

  public DeliveryStatus getDeliveryStatus(String messageId) {
    if (!properties.kakaoConfigured()) {
      return DeliveryStatus.failed("SOLAPI Kakao credentials are not configured.");
    }
    try {
      var query = "?criteria=messageId&cond=eq&value="
          + URLEncoder.encode(text(messageId), StandardCharsets.UTF_8)
          + "&limit=1";
      var response = client.send(
          request("GET", LIST_PATH + query, ""),
          HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      var payload = json.objectOrEmpty(response.body());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        return DeliveryStatus.unknown(providerError(payload, response.statusCode()));
      }
      if (!(payload.get("messageList") instanceof Map<?, ?> rawMessages)) {
        return DeliveryStatus.unknown("SOLAPI did not return a delivery result.");
      }
      var entry = rawMessages.get(messageId);
      if (!(entry instanceof Map<?, ?> rawMessage)) {
        return DeliveryStatus.unknown("SOLAPI did not return the requested message.");
      }
      return deliveryStatus(stringMap(rawMessage));
    } catch (Exception error) {
      return DeliveryStatus.unknown(error.getMessage() == null ? "Unknown SOLAPI result error." : error.getMessage());
    }
  }

  DeliveryStatus deliveryStatus(Map<String, Object> message) {
    if (booleanValue(message.get("replacement"))) {
      return DeliveryStatus.failed(firstNonBlank(
          message.get("reason"),
          "SOLAPI unexpectedly replaced the Kakao message with another channel."
      ));
    }
    var status = text(message.get("status"));
    var statusCode = text(message.get("statusCode"));
    if ("COMPLETE".equals(status) && "4000".equals(statusCode)) {
      return DeliveryStatus.sent();
    }
    if ("PENDING".equals(status) || "SENDING".equals(status)
        || "2000".equals(statusCode) || "3000".equals(statusCode)) {
      return DeliveryStatus.processing();
    }
    if ("COMPLETE".equals(status)) {
      return DeliveryStatus.failed(firstNonBlank(
          message.get("reason"),
          message.get("statusMessage"),
          "Kakao delivery failed with SOLAPI status " + statusCode + "."
      ));
    }
    return DeliveryStatus.unknown("SOLAPI delivery status is " + firstNonBlank(status, "unknown") + ".");
  }

  public boolean configured() {
    return properties.kakaoConfigured();
  }

  String authorization(String date, String salt) {
    var signature = hmacSha256Hex(text(date) + text(salt), text(properties.solapiApiSecret()));
    return "HMAC-SHA256 apiKey=" + text(properties.solapiApiKey())
        + ", date=" + text(date)
        + ", salt=" + text(salt)
        + ", signature=" + signature;
  }

  private HttpRequest request(String method, String path, String body) {
    var date = Instant.now(clock).toString();
    var salt = text(saltSupplier.get());
    var builder = HttpRequest.newBuilder()
        .uri(URI.create(properties.normalizedSolapiApiBaseUrl() + path))
        .timeout(Duration.ofSeconds(12))
        .header("Authorization", authorization(date, salt))
        .header("content-type", "application/json; charset=utf-8");
    return "POST".equals(method)
        ? builder.POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build()
        : builder.GET().build();
  }

  private String hmacSha256Hex(String message, String secret) {
    try {
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      var bytes = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
      var hex = new StringBuilder(bytes.length * 2);
      for (var value : bytes) {
        hex.append(String.format("%02x", value & 0xff));
      }
      return hex.toString();
    } catch (Exception error) {
      throw new IllegalStateException("Unable to sign the SOLAPI request.", error);
    }
  }

  private String providerError(Map<String, Object> payload, int statusCode) {
    return firstNonBlank(
        payload.get("errorMessage"),
        payload.get("message"),
        payload.get("statusMessage"),
        "SOLAPI request failed with HTTP " + statusCode + "."
    );
  }

  private String messageError(Object value, String fallback) {
    if (value instanceof Map<?, ?> raw) {
      var message = stringMap(raw);
      return firstNonBlank(message.get("statusMessage"), message.get("reason"), message.get("message"), fallback);
    }
    return fallback;
  }

  private Map<String, Object> stringMap(Map<?, ?> source) {
    var result = new java.util.LinkedHashMap<String, Object>();
    source.forEach((key, value) -> result.put(String.valueOf(key), value));
    return result;
  }

  private boolean booleanValue(Object value) {
    return value instanceof Boolean bool ? bool : "true".equalsIgnoreCase(text(value));
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

  public record SendResult(boolean accepted, String messageId, String errorMessage) {
    public static SendResult accepted(String messageId) {
      return new SendResult(true, messageId, "");
    }

    public static SendResult failed(String errorMessage) {
      return new SendResult(false, "", errorMessage);
    }
  }

  public record DeliveryStatus(String status, String errorMessage) {
    public static DeliveryStatus sent() {
      return new DeliveryStatus("sent", "");
    }

    public static DeliveryStatus processing() {
      return new DeliveryStatus("processing", "");
    }

    public static DeliveryStatus failed(String errorMessage) {
      return new DeliveryStatus("failed", errorMessage);
    }

    public static DeliveryStatus unknown(String errorMessage) {
      return new DeliveryStatus("unknown", errorMessage);
    }
  }
}
