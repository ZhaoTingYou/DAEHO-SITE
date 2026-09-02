package com.daeho.customer.repository;

import com.daeho.customer.service.VerificationSession;
import java.time.Instant;
import java.util.UUID;

public interface VerificationSessionStore {
  VerificationSession save(VerificationSession session);

  VerificationSession findByGrantHash(String grantHash);

  VerificationSession findLatestConsumedByPhone(String phone);

  VerificationSession findLatestConsumedByPhoneFingerprint(String fingerprint);

  void delete(UUID id);

  boolean consumeGrant(UUID id, String grantHash, Instant consumedAt);
}
