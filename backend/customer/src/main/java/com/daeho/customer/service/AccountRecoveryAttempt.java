package com.daeho.customer.service;

import java.time.Instant;
import java.util.UUID;

public record AccountRecoveryAttempt(
    UUID id,
    String purpose,
    UUID customerId,
    String loginName,
    String phoneFingerprint,
    String ipFingerprint,
    String idempotencyHash,
    String locale,
    String status,
    String challengeHash,
    int attemptCount,
    String providerMessageId,
    Instant sentAt,
    Instant deliveryLeaseExpiresAt,
    Instant expiresAt,
    String grantHash,
    Instant grantExpiresAt,
    Instant verifiedAt,
    Instant consumedAt,
    String resetOperationHash,
    String resetStage,
    Instant resetLeaseExpiresAt,
    Instant resetDeadlineAt,
    Instant createdAt
) {}
