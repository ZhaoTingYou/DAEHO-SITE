package com.daeho.customer.repository;

import com.daeho.customer.service.SmsChallenge;
import java.time.Instant;
import java.util.UUID;

public interface SmsChallengeStore {
  long countRecentForPhone(String phone, Instant since);

  long countRecentForIp(String ipFingerprint, Instant since);

  SmsChallenge findByIdempotencyHash(String hash);

  void create(SmsChallenge challenge);

  void markSent(UUID id, String providerMessageId, Instant sentAt);

  void markFailed(UUID id, Instant failedAt);

  SmsChallenge find(UUID id);

  void recordFailedAttempt(UUID id, Instant attemptedAt);

  boolean markVerified(UUID id, Instant verifiedAt);
}
