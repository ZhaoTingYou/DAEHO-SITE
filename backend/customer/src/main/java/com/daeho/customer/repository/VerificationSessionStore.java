package com.daeho.customer.repository;

import com.daeho.customer.service.VerificationSession;
import java.time.Instant;
import java.util.UUID;

public interface VerificationSessionStore {
  VerificationSession save(VerificationSession session);

  VerificationSession findByGrantHash(String grantHash);

  boolean consumeGrant(UUID id, String grantHash, Instant consumedAt);
}
