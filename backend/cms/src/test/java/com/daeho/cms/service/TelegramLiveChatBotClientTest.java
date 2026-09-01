package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.daeho.cms.config.NotificationProperties;
import java.io.IOException;
import java.net.ConnectException;
import java.net.http.HttpTimeoutException;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TelegramLiveChatBotClientTest {
  private final TelegramLiveChatBotClient client = new TelegramLiveChatBotClient(
      mock(NotificationProperties.class),
      mock(JsonSupport.class)
  );

  @Test
  void distinguishesPreSendConnectionFailuresFromUncertainReadFailures() {
    assertTrue(client.requestDefinitelyNotSent(new ConnectException("refused")));
    assertTrue(client.requestDefinitelyNotSent(new IOException(
        "wrapped",
        new javax.net.ssl.SSLHandshakeException("handshake")
    )));
    assertFalse(client.requestDefinitelyNotSent(new HttpTimeoutException("response timed out")));
    assertFalse(client.requestDefinitelyNotSent(new IOException("response reset")));
  }

  @Test
  void aSuccessfulMutationWithoutAProviderIdIsTreatedAsUncertain() {
    var error = assertThrows(
        TelegramLiveChatException.class,
        () -> client.requiredLong(Map.of(), "message_id", "missing id")
    );

    assertTrue(error.deliveryUncertain());
  }

  @Test
  void reconnectingTheWebhookKeepsPendingTelegramUpdates() {
    var payload = client.webhookPayload("https://daeho.works/webhook", "secret");

    assertFalse(payload.containsKey("drop_pending_updates"));
  }

  @Test
  void serverErrorsAreUncertainOnlyForMutatingTelegramCalls() {
    assertTrue(client.responseFailureUncertain("copyMessage", 500));
    assertTrue(client.responseFailureUncertain("setWebhook", 503));
    assertFalse(client.responseFailureUncertain("copyMessage", 400));
    assertFalse(client.responseFailureUncertain("getMe", 500));
    assertFalse(client.responseFailureUncertain("getChat", 500));
    assertFalse(client.responseFailureUncertain("getChatMember", 500));
  }
}
