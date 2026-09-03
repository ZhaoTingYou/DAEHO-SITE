package com.daeho.customer.repository;

import com.daeho.customer.service.AccountRecoveryAttempt;
import com.daeho.customer.service.AccountRecoveryDelivery;
import java.time.Instant;
import java.util.UUID;

public interface AccountRecoveryStore {
  void acquireRecoveryRateLimitLocks(
      String purpose, String phoneFingerprint, String ipFingerprint, String idempotencyHash);

  long countRecentRecoveryForPhone(String purpose, String phoneFingerprint, Instant since);

  long countRecentRecoveryForIp(String purpose, String ipFingerprint, Instant since);

  AccountRecoveryAttempt findRecoveryByIdempotencyHash(String hash);

  void createRecovery(AccountRecoveryAttempt attempt);

  AccountRecoveryDelivery findNextPendingRecovery(Instant now);

  void expireStaleRecoveryDeliveries(Instant now);

  void prepareRecoveryChallenge(UUID id, String challengeHash, Instant preparedAt);

  void markRecoverySending(UUID id, Instant leaseExpiresAt, Instant claimedAt);

  void markRecoverySent(UUID id, String providerMessageId, Instant sentAt);

  void markRecoveryFailed(UUID id, Instant failedAt);

  void markRecoveryDeliveryUnknown(UUID id, Instant failedAt);

  void markRecoveryDecoy(UUID id, Instant completedAt);

  AccountRecoveryAttempt findRecovery(UUID id);

  void recordRecoveryFailedAttempt(UUID id, Instant attemptedAt);

  boolean markRecoveryVerified(
      UUID id, String grantHash, Instant grantExpiresAt, Instant verifiedAt);

  AccountRecoveryAttempt findRecoveryByGrantHash(String grantHash);

  void acquireRecoveryGrantLock(String grantHash);

  boolean markRecoveryResetting(
      UUID id, String loginName, String operationHash, Instant leaseExpiresAt,
      Instant deadlineAt, Instant reservedAt);

  boolean isRecoveryAccountActive(UUID id, String loginName, Instant now);

  boolean renewRecoveryResetting(
      UUID id, String loginName, String operationHash, Instant leaseExpiresAt, Instant renewedAt);

  boolean markRecoverySessionsInvalidated(
      UUID id, String operationHash, Instant leaseExpiresAt, Instant invalidatedAt);

  boolean markRecoveryResetCompleted(UUID id, String operationHash, Instant completedAt);

  boolean releaseRecoveryReset(UUID id, String operationHash, Instant releasedAt);
}
