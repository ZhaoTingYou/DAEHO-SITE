package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.NotificationProperties;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
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
  void verificationFingerprintChangesWithTheTemplateVersionAndBody() {
    assertNotEquals(
        client().verificationFingerprint("customer_done_kakao_ko", "1", "KA01TP000001", "본문 1"),
        client().verificationFingerprint("customer_done_kakao_ko", "2", "KA01TP000001", "본문 2")
    );
  }

  @Test
  void verificationFingerprintChangesWithTheKakaoPresentationAndTitle() {
    assertNotEquals(
        client().verificationFingerprint(
            "customer_done_kakao_ko", "1", "KA01TP000001", "basic", "", "본문"
        ),
        client().verificationFingerprint(
            "customer_done_kakao_ko", "1", "KA01TP000001", "highlight", "{{name}}님 안내", "본문"
        )
    );
  }

  @Test
  void verificationFingerprintChangesWithTheProviderEndpoint() {
    assertNotEquals(
        client("https://api.solapi.com").verificationFingerprint(
            "customer_done_kakao_ko", "1", "KA01TP000001", "본문"
        ),
        client("http://127.0.0.1:9191").verificationFingerprint(
            "customer_done_kakao_ko", "1", "KA01TP000001", "본문"
        )
    );
  }

  @Test
  void refusesAnUntrustedProviderEndpoint() {
    assertFalse(client("https://example.com").configured());
    assertFalse(new SolapiKakaoClient(properties("http://127.0.0.1:9191"), new JsonSupport()).configured());
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
    assertFalse(body.contains("\"highlight\""));
    assertFalse(body.contains("\"from\""));
  }

  @Test
  void highlightedKakaoRequestIncludesTheRenderedTemplateTitle() {
    var body = client().requestBody(Map.of(
        "providerTemplateCode", "KA01TP000001",
        "recipient", "01012345678",
        "renderedBody", "홍길동님, 문의가 처리 중입니다.",
        "kakaoTemplateType", "highlight",
        "subject", "홍길동님의 문의 진행 안내"
    ));

    assertTrue(body.contains("\"highlight\":{\"title\":\"홍길동님의 문의 진행 안내\"}"));
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
    assertEquals("replacement", client.deliveryStatus(Map.of(
        "status", "COMPLETE",
        "statusCode", "4000",
        "replacement", true,
        "reason", "SMS replacement"
    )).status());
    assertEquals("replacement", client.deliveryStatus(Map.of(
        "status", "COMPLETE",
        "statusCode", "4000",
        "replacement", 1,
        "reason", "SMS replacement"
    )).status());
  }

  @Test
  void acceptsAnAuthenticatedSolapiRequestAndReturnsTheProviderMessageId() throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/messages/v4/send-many/detail", exchange -> {
      var response = """
          {"failedMessageList":[],"messageList":[{"messageId":"message-1","statusCode":"2000"}]}
          """.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(200, response.length);
      try (var output = exchange.getResponseBody()) {
        output.write(response);
      }
    });
    server.start();
    try {
      var client = client("http://127.0.0.1:" + server.getAddress().getPort());
      var result = client.send(Map.of(
          "providerTemplateCode", "KA01TP000001",
          "recipient", "01012345678",
          "renderedBody", "테스트"
      ));

      assertTrue(result.accepted());
      assertEquals("message-1", result.messageId());
    } finally {
      server.stop(0);
    }
  }

  @Test
  void reportsTransportFailuresAsUncertainSoTheyCannotBeAutomaticallyRetried() throws Exception {
    var http = mock(HttpClient.class);
    when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenThrow(new IOException("response lost"));
    var client = new SolapiKakaoClient(
        properties("https://api.solapi.com"),
        new JsonSupport(),
        http,
        Clock.fixed(Instant.parse("2024-07-31T00:00:00Z"), ZoneOffset.UTC),
        () -> "0123456789ab"
    );

    var result = client.send(Map.of(
        "providerTemplateCode", "KA01TP000001",
        "recipient", "01012345678",
        "renderedBody", "테스트"
    ));

    assertFalse(result.accepted());
    assertTrue(result.uncertain());
  }

  @Test
  void reportsAmbiguousProviderHttpFailuresAsUncertain() throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/messages/v4/send-many/detail", exchange -> {
      var response = "{\"message\":\"upstream timeout\"}".getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(503, response.length);
      try (var output = exchange.getResponseBody()) {
        output.write(response);
      }
    });
    server.start();
    try {
      var client = client("http://127.0.0.1:" + server.getAddress().getPort());
      var result = client.send(Map.of(
          "providerTemplateCode", "KA01TP000001",
          "recipient", "01012345678",
          "renderedBody", "테스트"
      ));

      assertFalse(result.accepted());
      assertTrue(result.uncertain());
    } finally {
      server.stop(0);
    }
  }

  private SolapiKakaoClient client() {
    return client("https://api.solapi.com");
  }

  private SolapiKakaoClient client(String apiBaseUrl) {
    var properties = properties(apiBaseUrl);
    return new SolapiKakaoClient(
        properties,
        new JsonSupport(),
        HttpClient.newHttpClient(),
        Clock.fixed(Instant.parse("2024-07-31T00:00:00Z"), ZoneOffset.UTC),
        () -> "0123456789ab"
    );
  }

  private NotificationProperties properties(String apiBaseUrl) {
    return new NotificationProperties(
        true,
        1000,
        "",
        apiBaseUrl,
        "api-key",
        "secret-key",
        "KA01PF000001"
    );
  }
}
