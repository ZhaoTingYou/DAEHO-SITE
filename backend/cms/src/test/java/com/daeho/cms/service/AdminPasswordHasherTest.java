package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.error.ValidationFailedException;
import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

class AdminPasswordHasherTest {
  @Test
  void hashesAndVerifiesWithoutStoringPlaintext() {
    var hasher = new AdminPasswordHasher(new SecureRandom());
    var encoded = hasher.hash("Owner-Passw0rd!");

    assertTrue(encoded.startsWith("pbkdf2_sha256$310000$"));
    assertFalse(encoded.contains("Owner-Passw0rd!"));
    assertTrue(hasher.verify("Owner-Passw0rd!", encoded));
    assertFalse(hasher.verify("Wrong-Passw0rd!", encoded));
  }

  @Test
  void rejectsMalformedHashesWithoutThrowing() {
    var hasher = new AdminPasswordHasher(new SecureRandom());

    assertFalse(hasher.verify("Owner-Passw0rd!", null));
    assertFalse(hasher.verify("Owner-Passw0rd!", ""));
    assertFalse(hasher.verify("Owner-Passw0rd!", "not-a-password-hash"));
    assertFalse(hasher.verify("Owner-Passw0rd!", "pbkdf2_sha256$invalid$salt$hash"));
    assertFalse(hasher.verify("Owner-Passw0rd!", "pbkdf2_sha256$310000$not+url$hash"));
  }

  @Test
  void rejectsWeakReplacementPasswords() {
    var hasher = new AdminPasswordHasher(new SecureRandom());

    assertThrows(ValidationFailedException.class,
        () -> hasher.validateReplacement("Owner-Passw0rd!", "short"));
    assertThrows(ValidationFailedException.class,
        () -> hasher.validateReplacement("Owner-Passw0rd!", "owner-passw0rd!"));
    assertThrows(ValidationFailedException.class,
        () -> hasher.validateReplacement("Owner-Passw0rd!", "OWNER-PASSW0RD!"));
    assertThrows(ValidationFailedException.class,
        () -> hasher.validateReplacement("Owner-Passw0rd!", "Owner-Password!"));
    assertThrows(ValidationFailedException.class,
        () -> hasher.validateReplacement("Owner-Passw0rd!", "OwnerPassw0rd1"));
    assertThrows(ValidationFailedException.class,
        () -> hasher.validateReplacement("Owner-Passw0rd!", " Owner-Passw0rd!"));
    assertThrows(ValidationFailedException.class,
        () -> hasher.validateReplacement("Owner-Passw0rd!", "Owner-Passw0rd!"));
    assertThrows(ValidationFailedException.class,
        () -> hasher.validateReplacement("Owner-Passw0rd!", "Aa1!" + "x".repeat(125)));
  }

  @Test
  void acceptsStrongReplacementAndHashesLegacyBootstrapValueWithoutPolicyRejection() {
    var hasher = new AdminPasswordHasher(new SecureRandom());

    hasher.validateReplacement("Owner-Passw0rd!", "N3w-Stronger-Pass!");
    var legacyHash = hasher.hash("legacy");

    assertTrue(hasher.verify("legacy", legacyHash));
  }
}
