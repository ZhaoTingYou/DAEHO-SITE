package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.NotificationProperties;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import javax.net.ssl.SSLHandshakeException;
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
      assertTrue(requestBody.get().contains("\"message_thread_id\":402"));
      assertTrue(requestBody.get().contains("새 문의가 접수되었습니다."));
    } finally {
      server.stop(0);
    }
  }

  @Test
  void blankTopicSendsToGeneralWithoutAMessageThreadId() throws Exception {
    var requestBody = new AtomicReference<String>();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/bottest-token/sendMessage", exchange -> {
      requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
      var response = """
          {"ok":true,"result":{"message_id":43}}
          """.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(200, response.length);
      try (var output = exchange.getResponseBody()) {
        output.write(response);
      }
    });
    server.start();
    try {
      var client = client(
          "http://127.0.0.1:" + server.getAddress().getPort(),
          HttpClient.newHttpClient(),
          ""
      );

      var result = client.send(Map.of(
          "recipient", "-1001234567890",
          "renderedBody", "General inquiry"
      ));

      assertTrue(result.success());
      assertFalse(requestBody.get().contains("message_thread_id"));
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

  @Test
  void tlsHandshakeFailuresRemainRetryableBecauseNoHttpBodyWasSent() throws Exception {
    var http = mock(HttpClient.class);
    when(http.send(
        any(HttpRequest.class),
        org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()
    )).thenThrow(new SSLHandshakeException("certificate validation failed"));

    var result = client("https://api.telegram.org", http).send(Map.of(
        "recipient", "-1001234567890",
        "renderedBody", "retryable inquiry"
    ));

    assertFalse(result.success());
    assertFalse(result.uncertain());
  }

  @Test
  void ambiguousProviderResponsesAreQuarantinedInsteadOfRetried() throws Exception {
    var missingOk = resultFor(200, "{}");
    var ambiguousServerError = resultFor(500, "upstream response lost");
    var explicitRejection = resultFor(400, "{\"ok\":false,\"description\":\"Bad Request\"}");

    assertTrue(missingOk.uncertain());
    assertTrue(ambiguousServerError.uncertain());
    assertFalse(explicitRejection.uncertain());
  }

  @Test
  void productionEndpointMustBeTheExactTelegramApiOrigin() {
    assertTrue(client("https://api.telegram.org").configured());
    assertFalse(client("https://api.telegram.org:444").configured());
    assertFalse(client("https://api.telegram.org/custom-path").configured());
    assertFalse(client("https://api.telegram.org?proxy=true").configured());
    assertFalse(client("https://user@api.telegram.org").configured());
  }

  private TelegramBotClient.SendResult resultFor(int status, String payload) throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/bottest-token/sendMessage", exchange -> {
      var response = payload.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(status, response.length);
      try (var output = exchange.getResponseBody()) {
        output.write(response);
      }
    });
    server.start();
    try {
      return client("http://127.0.0.1:" + server.getAddress().getPort()).send(Map.of(
          "recipient", "-1001234567890",
          "renderedBody", "test inquiry"
      ));
    } finally {
      server.stop(0);
    }
  }

  private TelegramBotClient client(String apiBaseUrl) {
    return client(apiBaseUrl, HttpClient.newHttpClient());
  }

  private TelegramBotClient client(String apiBaseUrl, HttpClient http) {
    return client(apiBaseUrl, http, "402");
  }

  private TelegramBotClient client(String apiBaseUrl, HttpClient http, String messageThreadId) {
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
    var credentials = mock(TelegramCredentialService.class);
    when(credentials.current()).thenReturn(
        new TelegramCredentialService.Credentials("test-token", "-1001234567890", messageThreadId)
    );
    return new TelegramBotClient(
        properties,
        credentials,
        new JsonSupport(),
        http
    );
  }
}
