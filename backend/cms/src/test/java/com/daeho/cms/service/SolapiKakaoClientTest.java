package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.config.NotificationProperties;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SolapiKakaoClientTest {
  @Test
  void signsRequestsWithSolapiHmacSha256() {
    assertEquals(
        "HMAC-SHA256 apiKey=api-key, date=2024-07-31T00:00:00Z, salt=0123456789ab, "
            + "signature=3896fdbb7a39118e152e8d3a3e7637b61e632fa0c72d8338871679aa3fa6fbb6",
        client().authorization("2024-07-31T00:00:00Z", "0123456789ab")
    );
  }

  @Test
  void kakaoRequestUsesApprovedTemplateAndHardDisablesSmsFallback() {
    var body = client().requestBody(Map.of(
        "providerTemplateCode", "KA01TP000001",
        "recipient", "01012345678",
        "renderedBody", "홍길동님, 문의가 처리 중입니다."
    ));

    assertTrue(body.contains("\"pfId\":\"KA01PF000001\""));
    assertTrue(body.contains("\"templateId\":\"KA01TP000001\""));
    assertTrue(body.contains("\"text\":\"홍길동님, 문의가 처리 중입니다.\""));
    assertTrue(body.contains("\"disableSms\":true"));
    assertFalse(body.contains("\"from\""));
  }

  @Test
  void deliveryStatusRequiresKakaoCompletionAndRejectsReplacement() {
    var client = client();

    assertEquals("sent", client.deliveryStatus(Map.of(
        "status", "COMPLETE",
        "statusCode", "4000",
        "replacement", false
    )).status());
    assertEquals("processing", client.deliveryStatus(Map.of(
        "status", "SENDING",
        "statusCode", "3000",
        "replacement", false
    )).status());
    assertEquals("failed", client.deliveryStatus(Map.of(
        "status", "COMPLETE",
        "statusCode", "4000",
        "replacement", true,
        "reason", "SMS replacement"
    )).status());
  }

  private SolapiKakaoClient client() {
    var properties = new NotificationProperties(
        true,
        1000,
        "",
        "https://api.solapi.com",
        "api-key",
        "secret-key",
        "KA01PF000001"
    );
    return new SolapiKakaoClient(
        properties,
        new JsonSupport(),
        HttpClient.newHttpClient(),
        Clock.fixed(Instant.parse("2024-07-31T00:00:00Z"), ZoneOffset.UTC),
        () -> "0123456789ab"
    );
  }
}
