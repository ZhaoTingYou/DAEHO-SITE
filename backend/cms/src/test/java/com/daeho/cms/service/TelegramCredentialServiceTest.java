package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
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
        "telegramMessageThreadId", "402",
        "clearTelegramBotToken", false
    ));

    assertTrue(prepared.configured());
    assertEquals(encrypted, prepared.payload().get("telegramBotTokenCiphertext"));
    assertEquals("-100-new", prepared.payload().get("telegramChatId"));
    assertEquals("402", prepared.payload().get("telegramMessageThreadId"));
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
  void verificationIsBoundToTheCurrentDecryptedTokenChatIdAndTopicId() {
    var encrypted = cipher.encrypt("saved-token");
    when(repository.getTelegramCredentials()).thenReturn(Map.of(
        "telegramBotTokenCiphertext", encrypted,
        "telegramChatId", "-100-current",
        "telegramMessageThreadId", "402"
    ));
    var current = credentials.current();
    var fingerprint = credentials.fingerprint(current);
    when(repository.telegramTestVerified(fingerprint)).thenReturn(true);

    assertEquals("402", current.messageThreadId());
    assertNotEquals(
        fingerprint,
        credentials.fingerprint(new TelegramCredentialService.Credentials(
            "saved-token", "-100-current", "403"
        ))
    );
    assertTrue(credentials.verified());
    credentials.markVerified(current);

    org.mockito.Mockito.verify(repository).markTelegramTestVerified(fingerprint);
  }

  @Test
  void reenteringTheSameTokenPreservesCiphertextAndVerification() {
    var encrypted = cipher.encrypt("same-token");
    when(repository.getTelegramCredentials()).thenReturn(Map.of(
        "telegramBotTokenCiphertext", encrypted,
        "telegramChatId", "-100-current"
    ));
    var fingerprint = credentials.fingerprint(
        new TelegramCredentialService.Credentials("same-token", "-100-current")
    );
    when(repository.telegramTestVerified(fingerprint)).thenReturn(true);

    var prepared = credentials.prepareUpdate(Map.of(
        "telegramEnabled", true,
        "telegramBotToken", "same-token",
        "telegramChatId", "-100-current",
        "clearTelegramBotToken", false
    ));

    assertEquals(encrypted, prepared.payload().get("telegramBotTokenCiphertext"));
    assertTrue(prepared.verified());
  }

  @Test
  void queuedJobsAreVerifiedAgainstTheCurrentFingerprintAndConfiguredGroup() {
    var encrypted = cipher.encrypt("saved-token");
    when(repository.getTelegramCredentials()).thenReturn(Map.of(
        "telegramBotTokenCiphertext", encrypted,
        "telegramChatId", "-100-current"
    ));
    var current = credentials.current();
    var fingerprint = credentials.fingerprint(current);
    when(repository.telegramTestVerified(fingerprint)).thenReturn(true);
    when(repository.telegramJobCredentialsMatch("job-current", fingerprint, "-100-current"))
        .thenReturn(true);

    assertTrue(credentials.jobVerified(Map.of(
        "id", "job-current"
    )));
    assertFalse(credentials.jobVerified(Map.of(
        "id", "job-old-group"
    )));
    assertFalse(credentials.jobVerified(Map.of(
        "id", "job-old-fingerprint"
    )));
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
