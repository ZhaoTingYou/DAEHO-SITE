package com.daeho.customer.repository;

import com.daeho.customer.model.CustomerProfile;
import com.daeho.customer.service.VerificationSession;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CustomerProfileStore {
  CustomerProfile findBySubject(String subject);

  CustomerProfile findByPhone(String phone);

  CustomerProfile findByCiFingerprint(String ciFingerprint);

  CustomerProfile createFromVerification(String subject, VerificationSession verification, String loginName);

  CustomerProfile relinkVerifiedPhone(
      UUID customerId, String subject, String loginName, VerificationSession verification);

  CustomerProfile update(String subject, String displayName, String email, String organization, String team, String locale);

  CustomerProfile markDeletionPending(String subject);

  CustomerProfile incrementSessionVersion(String subject);

  CustomerProfile updateStatus(UUID customerId, String status, String actor);

  int anonymizeDeletionPendingBefore(Instant cutoff);

  List<UUID> findCustomersAwaitingInquiryUnlink(int limit);

  void markInquiriesUnlinked(UUID customerId);

  void recordAudit(UUID customerId, String eventType, String actor);

  List<CustomerProfile> search(String query, int limit);
}
