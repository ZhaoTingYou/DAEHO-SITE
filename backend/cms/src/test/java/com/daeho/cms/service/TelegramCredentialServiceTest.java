package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.NotificationProperties;
import com.daeho.cms.repository.NotificationRepository;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TelegramCredentialServiceTest {
  private NotificationRepository repository;
  private TelegramCredentialCipher cipher;
  private TelegramCredentialService credentials;

  @BeforeEach
  void setUp() {
    repository = mock(NotificationRepository.class);
    cipher = new TelegramCredentialCipher(properties());
    credentials = new TelegramCredentialService(repository, cipher);
  }

  @Test
  void blankTokenInputKeepsTheEncryptedTokenAndNeverReturnsPlaintextInTheUpdatePayload() {
    var encrypted = cipher.encrypt("saved-token");
    when(repository.getTelegramCredentials()).thenReturn(Map.of(
        "telegramBotTokenCiphertext", encrypted,
        "telegramChatId", "-100-old"
    ));

    var prepared = credentials.prepareUpdate(Map.of(
        "telegramEnabled", true,
        "telegramBotToken", "",
        "telegramChatId", "-100-new",
        "clearTelegramBotToken", false
    ));

    assertTrue(prepared.configured());
    assertEquals(encrypted, prepared.payload().get("telegramBotTokenCiphertext"));
    assertEquals("-100-new", prepared.payload().get("telegramChatId"));
    assertFalse(prepared.payload().containsKey("telegramBotToken"));
    assertFalse(prepared.payload().containsKey("clearTelegramBotToken"));
  }

  @Test
  void replacesOrExplicitlyClearsTheSavedToken() {
    var oldEncrypted = cipher.encrypt("old-token");
    when(repository.getTelegramCredentials()).thenReturn(Map.of(
        "telegramBotTokenCiphertext", oldEncrypted,
        "telegramChatId", "-100-old"
    ));

    var replacement = credentials.prepareUpdate(Map.of(
        "telegramEnabled", false,
        "telegramBotToken", "new-token",
        "telegramChatId", "-100-new",
        "clearTelegramBotToken", false
    ));
    var cleared = credentials.prepareUpdate(Map.of(
        "telegramEnabled", false,
        "telegramBotToken", "",
        "telegramChatId", "-100-new",
        "clearTelegramBotToken", true
    ));

    assertEquals("new-token", cipher.decrypt(
        replacement.payload().get("telegramBotTokenCiphertext").toString()
    ).orElseThrow());
    assertEquals("", cleared.payload().get("telegramBotTokenCiphertext"));
    assertFalse(cleared.configured());
  }

  @Test
  void verificationIsBoundToTheCurrentDecryptedTokenAndChatId() {
    var encrypted = cipher.encrypt("saved-token");
    when(repository.getTelegramCredentials()).thenReturn(Map.of(
        "telegramBotTokenCiphertext", encrypted,
        "telegramChatId", "-100-current"
    ));
    var fingerprint = credentials.fingerprint(credentials.current());
    when(repository.telegramTestVerified(fingerprint)).thenReturn(true);

    assertTrue(credentials.verified());
    credentials.markCurrentVerified();

    org.mockito.Mockito.verify(repository).markTelegramTestVerified(fingerprint);
  }

  private NotificationProperties properties() {
    return new NotificationProperties(
        true,
        1000,
        "",
        "",
        "",
        "",
        "",
        "https://api.telegram.org",
        Base64.getEncoder().encodeToString(new byte[32])
    );
  }
}
