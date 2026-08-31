package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.config.NotificationProperties;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class TelegramCredentialCipherTest {
  @Test
  void encryptsWithAuthenticatedRandomizedCiphertextAndDecryptsOnlyWithTheSameKey() {
    var key = Base64.getEncoder().encodeToString(new byte[32]);
    var cipher = new TelegramCredentialCipher(properties(key));

    var first = cipher.encrypt("123456:secret-token");
    var second = cipher.encrypt("123456:secret-token");

    assertNotEquals("123456:secret-token", first);
    assertNotEquals(first, second);
    assertEquals("123456:secret-token", cipher.decrypt(first).orElseThrow());
    assertFalse(new TelegramCredentialCipher(properties(Base64.getEncoder().encodeToString(
        "another-32-byte-encryption-key!".getBytes()
    ))).decrypt(first).isPresent());
  }

  @Test
  void rejectsMissingOrMalformedServerEncryptionKeys() {
    assertFalse(new TelegramCredentialCipher(properties("")).configured());
    assertFalse(new TelegramCredentialCipher(properties("not-base64")).configured());
    assertTrue(new TelegramCredentialCipher(properties(
        Base64.getEncoder().encodeToString(new byte[32])
    )).configured());
  }

  private NotificationProperties properties(String encryptionKey) {
    return new NotificationProperties(
        true, 1000, "", "", "", "", "", "https://api.telegram.org", encryptionKey
    );
  }
}
