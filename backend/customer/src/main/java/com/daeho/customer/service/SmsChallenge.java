package com.daeho.customer.service;

import java.time.Instant;
import java.util.UUID;

public record SmsChallenge(
    UUID id,
    String phone,
    String ipFingerprint,
    String idempotencyHash,
    String locale,
    String termsVersion,
    String privacyVersion,
    boolean marketingConsent,
    String status,
    String challengeHash,
    int attemptCount,
    String providerMessageId,
    Instant sentAt,
    Instant expiresAt,
    Instant createdAt
) {
  public SmsChallenge sent(String messageId, Instant at) {
    return new SmsChallenge(
        id, phone, ipFingerprint, idempotencyHash, locale, termsVersion, privacyVersion, marketingConsent,
        status, challengeHash, attemptCount, messageId, at, expiresAt, createdAt
    );
  }

  public SmsChallenge failed() {
    return withStatus("failed", attemptCount);
  }

  public SmsChallenge failedAttempt() {
    return withStatus(status, attemptCount + 1);
  }

  public SmsChallenge verified() {
    return withStatus("verified", attemptCount);
  }

  private SmsChallenge withStatus(String value, int attempts) {
    return new SmsChallenge(
        id, phone, ipFingerprint, idempotencyHash, locale, termsVersion, privacyVersion, marketingConsent,
        value, challengeHash, attempts, providerMessageId, sentAt, expiresAt, createdAt
    );
  }
}
