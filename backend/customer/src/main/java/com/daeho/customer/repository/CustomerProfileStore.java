package com.daeho.customer.repository;

import com.daeho.customer.model.CustomerProfile;
import com.daeho.customer.service.VerificationSession;
import java.util.List;
import java.util.UUID;
import java.time.Instant;

public interface CustomerProfileStore {
  CustomerProfile findBySubject(String subject);

  CustomerProfile findByCiFingerprint(String ciFingerprint);

  CustomerProfile createFromVerification(String subject, VerificationSession verification);

  CustomerProfile update(String subject, String displayName, String email, String organization, String team, String locale);

  CustomerProfile markDeletionPending(String subject);

  CustomerProfile incrementSessionVersion(String subject);

  CustomerProfile updateStatus(UUID customerId, String status, String actor);

  int anonymizeDeletionPendingBefore(Instant cutoff);

  List<CustomerProfile> search(String query, int limit);
}
