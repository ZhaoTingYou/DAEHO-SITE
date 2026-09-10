package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.TelegramLiveChatProperties;
import com.daeho.cms.repository.TelegramLiveChatRepository;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class TelegramLiveChatCredentialServiceTest {
  @Test
  void adminViewExposesConfigurationStatusWithoutCredentialMaterial() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var settings = new TelegramLiveChatRepository.Settings(
        true, "ciphertext-secret", "DAEHO_LIVE_BOT", "-1001234567890", "", "실시간 상담",
        "webhook-secret-hash", "idle", "", 3L, "2026-09-01T00:00:00Z",
        "2026-09-01T00:00:00Z"
    );
    when(repository.settings()).thenReturn(settings);
    when(cipher.configured()).thenReturn(true);
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    var view = service.adminView();

    assertEquals(true, view.get("botTokenConfigured"));
    assertEquals("DAEHO_LIVE_BOT", view.get("botUsername"));
    assertEquals("09:00", view.get("businessHoursStart"));
    assertEquals("19:00", view.get("businessHoursEnd"));
    assertEquals("Asia/Seoul", view.get("businessHoursTimeZone"));
    assertFalse(view.containsKey("botTokenCiphertext"));
    assertFalse(view.containsKey("botToken"));
    assertFalse(view.containsKey("webhookSecretHash"));
  }

  @Test
  void publicViewRequiresTheAnonymousSessionCodecAndExposesSafeBusinessHours() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var ready = new TelegramLiveChatRepository.Settings(
        true,
        "ciphertext",
        "DAEHO_LIVE_BOT",
        "-1001234567890",
        "777",
        "실시간 상담",
        "secret-hash",
        "2026-09-01T00:00:00Z",
        "2026-09-01T00:00:00Z"
    );
    when(repository.settings()).thenReturn(ready);
    when(cipher.decrypt("ciphertext")).thenReturn(Optional.of("separate-live-token"));
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    assertEquals(Map.of(
        "enabled", true,
        "businessHoursStart", "09:00",
        "businessHoursEnd", "19:00",
        "businessHoursTimeZone", "Asia/Seoul"
    ), service.publicView(true));
    assertEquals(Map.of(
        "enabled", false,
        "businessHoursStart", "09:00",
        "businessHoursEnd", "19:00",
        "businessHoursTimeZone", "Asia/Seoul"
    ), service.publicView(false));
  }

  @Test
  void savesCmsBusinessHoursWithoutResettingTheTelegramConnection() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var current = TelegramLiveChatRepository.Settings.empty();
    when(repository.settingsForUpdate()).thenReturn(current);
    when(repository.saveDraft("", "", "실시간 상담", false, false, "10:30", "18:15"))
        .thenReturn(current);
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    service.update(Map.of(
        "enabled", false,
        "businessHoursStart", "10:30",
        "businessHoursEnd", "18:15"
    ));

    verify(repository).saveDraft(
        "", "", "실시간 상담", false, false, "10:30", "18:15"
    );
  }

  @Test
  void acceptsNewConsultationsOnlyInsideConfiguredSeoulHours() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var ready = new TelegramLiveChatRepository.Settings(
        true, "ciphertext", "DAEHO_LIVE_BOT", "-1001234567890", "777", "실시간 상담",
        "secret-hash", "idle", "", 3L, "2026-09-01T00:00:00Z",
        "2026-09-01T00:00:00Z", "09:00", "19:00"
    );
    when(repository.settings()).thenReturn(ready);
    when(cipher.decrypt("ciphertext")).thenReturn(Optional.of("separate-live-token"));
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    assertTrue(service.acceptingNewConversations(
        java.time.Instant.parse("2026-09-11T00:00:00Z")
    ));
    assertFalse(service.acceptingNewConversations(
        java.time.Instant.parse("2026-09-11T10:00:00Z")
    ));
  }

  @Test
  void verifiesTheSeparateBotAndRegistersTheWebhookWithoutCreatingACustomerTopic() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var draft = new TelegramLiveChatRepository.Settings(
        false,
        "ciphertext",
        "",
        "-1001234567890",
        "",
        "실시간 상담",
        "",
        "",
        ""
    );
    var connected = new TelegramLiveChatRepository.Settings(
        false,
        "ciphertext",
        "DAEHO_LIVE_BOT",
        "-1001234567890",
        "",
        "실시간 상담",
        "secret-hash",
        "2026-09-01T00:00:00Z",
        "2026-09-01T00:00:00Z"
    );
    when(repository.beginConnect(anyString())).thenReturn(draft);
    when(cipher.decrypt("ciphertext")).thenReturn(Optional.of("separate-live-token"));
    when(gateway.getMe("separate-live-token"))
        .thenReturn(new TelegramLiveChatGateway.BotIdentity("DAEHO_LIVE_BOT"));
    when(repository.markConnected(anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
        .thenReturn(connected);

    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    var result = service.connect();

    assertTrue(result.connected());
    assertEquals("DAEHO_LIVE_BOT", result.botUsername());
    verify(gateway).setWebhook(
        org.mockito.ArgumentMatchers.eq("separate-live-token"),
        org.mockito.ArgumentMatchers.eq("https://daeho.works/api/telegram/live-chat/webhook"),
        anyString()
    );
    verify(gateway).verifyForumAccess(
        "separate-live-token", "-1001234567890", 1L
    );
    verify(repository).markConnected(
        org.mockito.ArgumentMatchers.eq("DAEHO_LIVE_BOT"),
        org.mockito.ArgumentMatchers.eq(""),
        anyString(),
        org.mockito.ArgumentMatchers.eq("ciphertext"),
        org.mockito.ArgumentMatchers.eq("-1001234567890"),
        anyString()
    );
    verify(gateway, never()).createForumTopic(anyString(), anyString(), anyString());
    verify(repository, never()).saveMessageThreadId(
        anyString(), anyString(), anyString(), anyString()
    );
  }

  @Test
  void rejectsABotWhoseGroupPrivacyModeIsStillEnabled() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var draft = new TelegramLiveChatRepository.Settings(
        false, "ciphertext", "", "-1001234567890", "", "실시간 상담", "", "", ""
    );
    when(repository.beginConnect(anyString())).thenReturn(draft);
    when(cipher.decrypt("ciphertext")).thenReturn(Optional.of("separate-live-token"));
    when(gateway.getMe("separate-live-token")).thenReturn(
        new TelegramLiveChatGateway.BotIdentity(77L, "DAEHO_LIVE_BOT", false)
    );
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    var error = assertThrows(ResponseStatusException.class, service::connect);

    assertEquals(409, error.getStatusCode().value());
    verify(gateway, never()).verifyForumAccess(anyString(), anyString(), org.mockito.ArgumentMatchers.anyLong());
    verify(gateway, never()).setWebhook(anyString(), anyString(), anyString());
  }

  @Test
  void rejectsReusingTheExistingNotificationBotToken() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var draft = new TelegramLiveChatRepository.Settings(
        false,
        "ciphertext",
        "",
        "-1001234567890",
        "",
        "실시간 상담",
        "",
        "",
        ""
    );
    when(repository.beginConnect(anyString())).thenReturn(draft);
    when(cipher.decrypt("ciphertext")).thenReturn(Optional.of("same-token"));
    org.mockito.Mockito.doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT))
        .when(separationGuard).requireSeparateLiveChatToken("same-token");
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    var error = assertThrows(ResponseStatusException.class, service::connect);

    assertEquals(409, error.getStatusCode().value());
    verify(gateway, never()).getMe(anyString());
  }

  @Test
  void hidesAndCannotEnableAConnectedBotWhenItsTokenCannotBeDecrypted() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var connected = new TelegramLiveChatRepository.Settings(
        true,
        "ciphertext",
        "DAEHO_LIVE_BOT",
        "-1001234567890",
        "777",
        "실시간 상담",
        "secret-hash",
        "2026-09-01T00:00:00Z",
        "2026-09-01T00:00:00Z"
    );
    when(repository.settings()).thenReturn(connected);
    when(repository.settingsForUpdate()).thenReturn(connected);
    when(cipher.decrypt("ciphertext")).thenReturn(Optional.empty());
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    assertFalse((Boolean) service.publicView(true).get("enabled"));
    assertThrows(ResponseStatusException.class, () -> service.setEnabled(true));
    verify(repository, never()).setEnabled(true);
  }

  @Test
  void hidesAndCannotEnableAConnectedBotWhileSetupNeedsReview() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var needsReview = new TelegramLiveChatRepository.Settings(
        true,
        "ciphertext",
        "DAEHO_LIVE_BOT",
        "-1001234567890",
        "777",
        "실시간 상담",
        "secret-hash",
        "needs_attention",
        "webhook_setup_uncertain",
        "2026-09-01T00:00:00Z",
        "2026-09-01T00:00:00Z"
    );
    when(repository.settings()).thenReturn(needsReview);
    when(repository.settingsForUpdate()).thenReturn(needsReview);
    when(cipher.decrypt("ciphertext")).thenReturn(Optional.of("separate-live-token"));
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    assertFalse((Boolean) service.publicView(true).get("enabled"));
    assertThrows(ResponseStatusException.class, () -> service.setEnabled(true));
    verify(repository, never()).setEnabled(true);
  }

  @Test
  void failedWebhookSetupCanBeRetriedWithoutCreatingACustomerTopic() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var draft = new TelegramLiveChatRepository.Settings(
        false, "ciphertext", "", "-1001234567890", "", "실시간 상담", "", "", ""
    );
    var connected = new TelegramLiveChatRepository.Settings(
        false, "ciphertext", "DAEHO_LIVE_BOT", "-1001234567890", "", "실시간 상담",
        "secret-hash", "2026-09-01T00:00:00Z", "2026-09-01T00:00:00Z"
    );
    when(repository.beginConnect(anyString())).thenReturn(draft, draft);
    when(repository.markConnected(anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
        .thenReturn(connected);
    when(cipher.decrypt("ciphertext")).thenReturn(Optional.of("separate-live-token"));
    when(gateway.getMe("separate-live-token"))
        .thenReturn(new TelegramLiveChatGateway.BotIdentity("DAEHO_LIVE_BOT"));
    org.mockito.Mockito.doThrow(new TelegramLiveChatException("webhook failed"))
        .doNothing()
        .when(gateway).setWebhook(
            org.mockito.ArgumentMatchers.eq("separate-live-token"),
            org.mockito.ArgumentMatchers.eq("https://daeho.works/api/telegram/live-chat/webhook"),
            anyString()
        );
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    assertThrows(TelegramLiveChatException.class, service::connect);
    assertTrue(service.connect().connected());

    verify(gateway, never()).createForumTopic(anyString(), anyString(), anyString());
  }

  @Test
  void enablingRechecksBotSeparationWhileHoldingTheSettingsLock() {
    var repository = mock(TelegramLiveChatRepository.class);
    var cipher = mock(TelegramCredentialCipher.class);
    var gateway = mock(TelegramLiveChatGateway.class);
    var separationGuard = mock(TelegramBotSeparationGuard.class);
    var connected = new TelegramLiveChatRepository.Settings(
        false, "ciphertext", "DAEHO_LIVE_BOT", "-1001234567890", "777", "실시간 상담",
        "secret-hash", "2026-09-01T00:00:00Z", "2026-09-01T00:00:00Z"
    );
    when(repository.settingsForUpdate()).thenReturn(connected);
    when(repository.setEnabled(true)).thenReturn(connected);
    when(cipher.decrypt("ciphertext")).thenReturn(Optional.of("separate-live-token"));
    var service = new TelegramLiveChatCredentialService(
        repository,
        cipher,
        gateway,
        new TelegramLiveChatProperties("https://daeho.works"),
        separationGuard
    );

    service.setEnabled(true);

    verify(separationGuard).lockConfiguration();
    verify(separationGuard).requireSeparateLiveChatToken("separate-live-token");
    verify(repository).settingsForUpdate();
    verify(repository).setEnabled(true);
  }

}
