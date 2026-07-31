package com.daeho.cms.service;

import com.daeho.cms.config.NotificationProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class NaverSensKakaoClient {
  private final NotificationProperties properties;
  private final JsonSupport json;
  private final HttpClient client;
  private final Clock clock;

  @Autowired
  public NaverSensKakaoClient(NotificationProperties properties, JsonSupport json) {
    this(
        properties,
        json,
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build(),
        Clock.systemUTC()
    );
  }

  NaverSensKakaoClient(
      NotificationProperties properties,
      JsonSupport json,
      HttpClient client,
      Clock clock
  ) {
    this.properties = properties;
    this.json = json;
    this.client = client;
    this.clock = clock;
  }

  public SendResult send(Map<String, Object> job) {
    if (!properties.kakaoConfigured()) {
      return SendResult.failed("Naver SENS Kakao credentials are not configured.");
    }
    var templateCode = text(job.get("providerTemplateCode"));
    if (templateCode.isBlank()) {
      return SendResult.failed("An approved Kakao template code is not configured.");
    }
    var path = servicePath();
    var body = requestBody(job);
    try {
      var response = client.send(
          request("POST", path, body),
          HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      var payload = json.objectOrEmpty(response.body());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        return SendResult.failed(providerError(payload, response.statusCode()));
      }
      var messages = payload.get("messages") instanceof List<?> list ? list : List.of();
      if (messages.isEmpty() || !(messages.get(0) instanceof Map<?, ?> rawMessage)) {
        return SendResult.failed("Naver SENS did not return a Kakao message result.");
      }
      var message = stringMap(rawMessage);
      if (!"success".equals(text(message.get("requestStatusName")))) {
        return SendResult.failed(firstNonBlank(
            message.get("requestStatusDesc"),
            payload.get("statusName"),
            "Naver SENS rejected the Kakao message."
        ));
      }
      var messageId = text(message.get("messageId"));
      return messageId.isBlank()
          ? SendResult.failed("Naver SENS did not return a Kakao message ID.")
          : SendResult.accepted(messageId);
    } catch (Exception error) {
      return SendResult.failed(error.getMessage() == null ? "Unknown Kakao API error." : error.getMessage());
    }
  }

  String requestBody(Map<String, Object> job) {
    return json.stringify(Map.of(
        "plusFriendId", text(properties.kakaoChannelId()),
        "templateCode", text(job.get("providerTemplateCode")),
        "messages", List.of(Map.of(
            "countryCode", "82",
            "to", text(job.get("recipient")),
            "content", text(job.get("renderedBody")),
            "useSmsFailover", false
        ))
    ));
  }

  public DeliveryStatus getDeliveryStatus(String messageId) {
    if (!properties.kakaoConfigured()) {
      return DeliveryStatus.failed("Naver SENS Kakao credentials are not configured.");
    }
    var path = servicePath() + "/" + text(messageId);
    try {
      var response = client.send(
          request("GET", path, ""),
          HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      var payload = json.objectOrEmpty(response.body());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        return DeliveryStatus.unknown(providerError(payload, response.statusCode()));
      }
      return switch (text(payload.get("messageStatusName"))) {
        case "success" -> DeliveryStatus.sent();
        case "fail" -> DeliveryStatus.failed(firstNonBlank(
            payload.get("messageStatusDesc"),
            "Kakao delivery failed."
        ));
        default -> DeliveryStatus.processing();
      };
    } catch (Exception error) {
      return DeliveryStatus.unknown(error.getMessage() == null ? "Unknown Kakao result error." : error.getMessage());
    }
  }

  public boolean configured() {
    return properties.kakaoConfigured();
  }

  String signature(String method, String path, String timestamp) {
    try {
      var message = method + " " + path + "\n" + timestamp + "\n" + text(properties.kakaoAccessKey());
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(
          text(properties.kakaoSecretKey()).getBytes(StandardCharsets.UTF_8),
          "HmacSHA256"
      ));
      return Base64.getEncoder().encodeToString(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) {
      throw new IllegalStateException("Unable to sign the Naver SENS request.", error);
    }
  }

  private HttpRequest request(String method, String path, String body) {
    var timestamp = String.valueOf(clock.millis());
    var builder = HttpRequest.newBuilder()
        .uri(URI.create(properties.normalizedKakaoApiBaseUrl() + path))
        .timeout(Duration.ofSeconds(12))
        .header("x-ncp-apigw-timestamp", timestamp)
        .header("x-ncp-iam-access-key", text(properties.kakaoAccessKey()))
        .header("x-ncp-apigw-signature-v2", signature(method, path, timestamp))
        .header("content-type", "application/json; charset=utf-8");
    return "POST".equals(method)
        ? builder.POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build()
        : builder.GET().build();
  }

  private String servicePath() {
    return "/alimtalk/v2/services/" + text(properties.kakaoServiceId()) + "/messages";
  }

  private String providerError(Map<String, Object> payload, int statusCode) {
    return firstNonBlank(
        payload.get("errorMessage"),
        payload.get("message"),
        payload.get("statusName"),
        "Naver SENS request failed with HTTP " + statusCode + "."
    );
  }

  private Map<String, Object> stringMap(Map<?, ?> source) {
    var result = new java.util.LinkedHashMap<String, Object>();
    source.forEach((key, value) -> result.put(String.valueOf(key), value));
    return result;
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
