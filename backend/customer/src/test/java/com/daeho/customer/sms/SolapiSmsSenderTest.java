package com.daeho.customer.sms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class SolapiSmsSenderTest {
  private HttpServer server;
  private final AtomicReference<String> requestBody = new AtomicReference<>();
  private final AtomicReference<String> authorization = new AtomicReference<>();

  @BeforeEach
  void startServer() throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
  }

  @AfterEach
  void stopServer() {
    server.stop(0);
  }

  @Test
  void sendsAnSmsAndReturnsTheAcceptedGroupId() throws Exception {
    server.createContext("/messages/v4/send-many/detail", exchange -> {
      requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
      authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
      var response = """
          {"failedMessageList":[],"groupInfo":{"groupId":"group-123","count":{"registeredSuccess":1}}}
          """.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(200, response.length);
      exchange.getResponseBody().write(response);
      exchange.close();
    });
    server.start();

    var sender = sender();
    var receipt = sender.send("+821012345678", "[DAEHO] 인증번호 123456 (10분간 유효)");

    assertThat(receipt.providerMessageId()).isEqualTo("group-123");
    assertThat(authorization.get()).startsWith(
        "HMAC-SHA256 apiKey=api-key, date=2026-09-02T01:02:03Z, salt=0123456789abcdef, signature="
    );
    assertThat(requestBody.get()).contains(
        "\"to\":\"01012345678\"",
        "\"from\":\"0212345678\"",
        "\"text\":\"[DAEHO] 인증번호 123456 (10분간 유효)\"",
        "\"type\":\"SMS\""
    );
  }

  @Test
  void rejectsAProviderResponseThatContainsFailedMessages() throws Exception {
    server.createContext("/messages/v4/send-many/detail", exchange -> {
      var response = """
          {"failedMessageList":[{"statusCode":"InvalidFrom"}],"groupInfo":{"groupId":"group-123"}}
          """.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(200, response.length);
      exchange.getResponseBody().write(response);
      exchange.close();
    });
    server.start();

    assertThatThrownBy(() -> sender().send("+821012345678", "[DAEHO] 인증번호 123456 (10분간 유효)"))
        .isInstanceOf(SmsDeliveryException.class)
        .hasMessage("SOLAPI did not accept the verification SMS");
  }

  private SolapiSmsSender sender() {
    var baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
    return new SolapiSmsSender(
        HttpClient.newHttpClient(),
        new ObjectMapper(),
        baseUrl,
        "api-key",
        "api-secret",
        "0212345678",
        Clock.fixed(Instant.parse("2026-09-02T01:02:03Z"), ZoneOffset.UTC),
        () -> "0123456789abcdef"
    );
  }
}
