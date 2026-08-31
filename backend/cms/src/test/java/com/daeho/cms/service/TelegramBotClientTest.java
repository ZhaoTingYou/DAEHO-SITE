package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.config.NotificationProperties;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class TelegramBotClientTest {
  @Test
  void sendsTheRenderedInquiryToTheConfiguredGroupAndReturnsTheMessageId() throws Exception {
    var requestBody = new AtomicReference<String>();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/bottest-token/sendMessage", exchange -> {
      requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
      var response = """
          {"ok":true,"result":{"message_id":42}}
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
          "recipient", "-1001234567890",
          "renderedBody", "새 문의가 접수되었습니다.\nCMS: https://daeho.works/admin/inquiries/inquiry-1"
      ));

      assertTrue(result.success());
      assertEquals("42", result.messageId());
      assertTrue(requestBody.get().contains("\"chat_id\":\"-1001234567890\""));
      assertTrue(requestBody.get().contains("새 문의가 접수되었습니다."));
    } finally {
      server.stop(0);
    }
  }

  @Test
  void connectionFailuresRemainRetryableBecauseNoRequestReachedTelegram() throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    var endpoint = "http://127.0.0.1:" + server.getAddress().getPort();
    server.start();
    server.stop(0);

    var result = client(endpoint).send(Map.of(
        "recipient", "-1001234567890",
        "renderedBody", "retryable inquiry"
    ));

    assertFalse(result.success());
    assertFalse(result.uncertain());
  }

  private TelegramBotClient client(String apiBaseUrl) {
    var properties = new NotificationProperties(
        true,
        1000,
        "https://daeho.works/admin",
        "",
        "",
        "",
        "",
        apiBaseUrl,
        ""
    );
    var credentials = org.mockito.Mockito.mock(TelegramCredentialService.class);
    org.mockito.Mockito.when(credentials.current()).thenReturn(
        new TelegramCredentialService.Credentials("test-token", "-1001234567890")
    );
    return new TelegramBotClient(
        properties,
        credentials,
        new JsonSupport(),
        HttpClient.newHttpClient()
    );
  }
}
