package com.daeho.customer.sms;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import tools.jackson.databind.ObjectMapper;

public final class SolapiSmsSender implements SmsSender {
  private static final String SEND_PATH = "/messages/v4/send-many/detail";
  private final HttpClient http;
  private final ObjectMapper json;
  private final String baseUrl;
  private final String apiKey;
  private final String apiSecret;
  private final String senderNumber;
  private final Clock clock;
  private final Supplier<String> saltSupplier;

  public SolapiSmsSender(
      HttpClient http,
      ObjectMapper json,
      String baseUrl,
      String apiKey,
      String apiSecret,
      String senderNumber,
      Clock clock,
      Supplier<String> saltSupplier) {
    this.http = http;
    this.json = json;
    this.baseUrl = stripTrailingSlash(baseUrl);
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.senderNumber = digits(senderNumber);
    this.clock = clock;
    this.saltSupplier = saltSupplier;
  }

  @Override
  public SmsSendReceipt send(String to, String text) {
    if (!isConfigured()) {
      throw new SmsDeliveryException("SOLAPI SMS is not configured");
    }
    try {
      var body = json.writeValueAsString(Map.of(
          "messages", List.of(Map.of(
              "to", koreanLocalNumber(to),
              "from", senderNumber,
              "text", text,
              "type", "SMS",
              "country", "82"
          )),
          "strict", true,
          "allowDuplicates", false,
          "showMessageList", false
      ));
      var request = HttpRequest.newBuilder(URI.create(baseUrl + SEND_PATH))
          .timeout(Duration.ofSeconds(8))
          .header("Authorization", SolapiAuthorization.header(
              apiKey, apiSecret, clock.instant(), saltSupplier.get()))
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();
      var response = http.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new SmsDeliveryException("SOLAPI did not accept the verification SMS");
      }
      var payload = json.readTree(response.body());
      var failures = payload.path("failedMessageList");
      var accepted = payload.path("groupInfo").path("count").path("registeredSuccess").asInt(0);
      var groupId = payload.path("groupInfo").path("groupId").asText("");
      if (!failures.isArray() || !failures.isEmpty() || accepted < 1 || groupId.isBlank()) {
        throw new SmsDeliveryException("SOLAPI did not accept the verification SMS");
      }
      return new SmsSendReceipt(groupId);
    } catch (SmsDeliveryException error) {
      throw error;
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new SmsDeliveryException("SOLAPI SMS request was interrupted", error);
    } catch (Exception error) {
      throw new SmsDeliveryException("SOLAPI SMS could not be sent", error);
    }
  }

  @Override
  public boolean isConfigured() {
    return !apiKey.isBlank() && !apiSecret.isBlank() && !senderNumber.isBlank()
        && (baseUrl.startsWith("https://") || baseUrl.startsWith("http://127.0.0.1:"));
  }

  private static String koreanLocalNumber(String value) {
    var compact = value == null ? "" : value.replaceAll("[^0-9+]", "");
    if (compact.startsWith("+82")) {
      return "0" + compact.substring(3);
    }
    return digits(compact);
  }

  private static String digits(String value) {
    return value == null ? "" : value.replaceAll("[^0-9]", "");
  }

  private static String stripTrailingSlash(String value) {
    if (value == null) {
      return "";
    }
    return value.replaceAll("/+$", "");
  }
}
