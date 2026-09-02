package com.daeho.customer.repository;

import com.daeho.customer.model.CustomerProfile;
import com.daeho.customer.service.VerificationSession;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JdbcCustomerRepository implements CustomerProfileStore, VerificationSessionStore, SmsChallengeStore {
  private final JdbcTemplate jdbc;

  public JdbcCustomerRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public VerificationSession save(VerificationSession session) {
    jdbc.update("""
        INSERT INTO verification_sessions (
          id, method, identifier, legal_name, phone, ci_fingerprint, adult_verified,
          locale, terms_version, privacy_version, marketing_consent, status,
          grant_hash, grant_expires_at, expires_at, consumed_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
        ON CONFLICT (id) DO UPDATE SET
          status = excluded.status,
          ci_fingerprint = excluded.ci_fingerprint,
          grant_hash = excluded.grant_hash,
          grant_expires_at = excluded.grant_expires_at,
          consumed_at = excluded.consumed_at,
          updated_at = now()
        """,
        session.id(), session.method(), session.identifier(), session.legalName(), session.phone(),
        session.ciFingerprint(), session.adultVerified(), session.locale(), session.termsVersion(),
        session.privacyVersion(), session.marketingConsent(), session.status(), session.grantHash(),
        session.grantExpiresAt(), session.expiresAt(), session.consumedAt()
    );
    return session;
  }

  @Override
  public VerificationSession findByGrantHash(String grantHash) {
    return jdbc.query("SELECT * FROM verification_sessions WHERE grant_hash = ?", this::mapVerification, grantHash)
        .stream().findFirst().orElse(null);
  }

  @Override
  public VerificationSession findLatestConsumedByPhone(String phone) {
    return jdbc.query("""
        SELECT * FROM verification_sessions
        WHERE method = 'sms_declaration' AND phone = ? AND status = 'verified'
          AND consumed_at IS NOT NULL
        ORDER BY consumed_at DESC LIMIT 1
        """, this::mapVerification, phone).stream().findFirst().orElse(null);
  }

  @Override
  public VerificationSession findLatestConsumedByPhoneFingerprint(String fingerprint) {
    return jdbc.query("""
        SELECT * FROM verification_sessions
        WHERE method = 'sms_declaration' AND ci_fingerprint = ? AND status = 'verified'
          AND consumed_at IS NOT NULL ORDER BY consumed_at DESC LIMIT 1
        """, this::mapVerification, fingerprint).stream().findFirst().orElse(null);
  }

  @Override
  public void delete(UUID id) {
    jdbc.update("DELETE FROM verification_sessions WHERE id = ?", id);
  }

  @Override
  public boolean consumeGrant(UUID id, String grantHash, Instant consumedAt) {
    return jdbc.update("""
        UPDATE verification_sessions SET consumed_at = ?, updated_at = now()
        WHERE id = ? AND grant_hash = ? AND consumed_at IS NULL AND grant_expires_at > now()
        """, consumedAt, id, grantHash) == 1;
  }

  @Override
  public void acquireRateLimitLocks(String phone, String ipFingerprint, String idempotencyHash) {
    java.util.stream.Stream.of(
        "sms-phone:" + phone,
        "sms-ip:" + ipFingerprint,
        "sms-idempotency:" + idempotencyHash
    ).sorted().forEach(lockKey -> jdbc.queryForList(
        "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", lockKey));
  }

  @Override
  public long countRecentForPhone(String phone, Instant since) {
    var count = jdbc.queryForObject("""
        SELECT COUNT(*) FROM verification_sessions
        WHERE method = 'sms_declaration' AND phone = ? AND created_at >= ?
        """, Long.class, phone, since);
    return count == null ? 0 : count;
  }

  @Override
  public long countRecentForIp(String ipFingerprint, Instant since) {
    var count = jdbc.queryForObject("""
        SELECT COUNT(*) FROM verification_sessions
        WHERE method = 'sms_declaration' AND ip_fingerprint = ? AND created_at >= ?
        """, Long.class, ipFingerprint, since);
    return count == null ? 0 : count;
  }

  @Override
  public com.daeho.customer.service.SmsChallenge findByIdempotencyHash(String hash) {
    return jdbc.query("""
        SELECT * FROM verification_sessions
        WHERE method = 'sms_declaration' AND idempotency_key_hash = ?
        """, (rs, rowNum) -> mapSmsChallenge(rs), hash).stream().findFirst().orElse(null);
  }

  @Override
  public void create(com.daeho.customer.service.SmsChallenge challenge) {
    jdbc.update("""
        INSERT INTO verification_sessions (
          id, method, identifier, phone, adult_verified, locale, terms_version,
          privacy_version, marketing_consent, status, challenge_hash, attempt_count,
          ip_fingerprint, idempotency_key_hash, provider, provider_message_id,
          expires_at, created_at, updated_at
        ) VALUES (?, 'sms_declaration', ?, ?, true, ?, ?, ?, ?, 'pending', ?, 0, ?,
          ?, 'solapi', '', ?, ?, ?)
        """, challenge.id(), challenge.phone(), challenge.phone(), challenge.locale(),
        challenge.termsVersion(), challenge.privacyVersion(), challenge.marketingConsent(),
        challenge.challengeHash(), challenge.ipFingerprint(), challenge.idempotencyHash(), challenge.expiresAt(),
        challenge.createdAt(), challenge.createdAt());
  }

  @Override
  public void markSent(UUID id, String providerMessageId, Instant sentAt) {
    var updated = jdbc.update("""
        UPDATE verification_sessions SET provider_message_id = ?, sent_at = ?, updated_at = ?
        WHERE id = ? AND method = 'sms_declaration' AND status = 'pending'
        """, providerMessageId, sentAt, sentAt, id);
    if (updated != 1) {
      throw new IllegalStateException("SMS challenge could not be marked as sent");
    }
  }

  @Override
  public void markFailed(UUID id, Instant failedAt) {
    jdbc.update("""
        UPDATE verification_sessions SET status = 'failed', challenge_hash = '', updated_at = ?
        WHERE id = ? AND method = 'sms_declaration' AND status = 'pending'
        """, failedAt, id);
  }

  @Override
  public com.daeho.customer.service.SmsChallenge find(UUID id) {
    return jdbc.query("""
        SELECT * FROM verification_sessions WHERE id = ? AND method = 'sms_declaration'
        """, (rs, rowNum) -> mapSmsChallenge(rs), id).stream().findFirst().orElse(null);
  }

  private com.daeho.customer.service.SmsChallenge mapSmsChallenge(ResultSet rs) throws SQLException {
    return new com.daeho.customer.service.SmsChallenge(
        rs.getObject("id", UUID.class), rs.getString("phone"), rs.getString("ip_fingerprint"),
        rs.getString("idempotency_key_hash"), rs.getString("locale"), rs.getString("terms_version"),
        rs.getString("privacy_version"), rs.getBoolean("marketing_consent"), rs.getString("status"),
        rs.getString("challenge_hash"), rs.getInt("attempt_count"), rs.getString("provider_message_id"),
        instant(rs, "sent_at"), instant(rs, "expires_at"), instant(rs, "created_at")
    );
  }

  @Override
  public void recordFailedAttempt(UUID id, Instant attemptedAt) {
    jdbc.update("""
        UPDATE verification_sessions SET attempt_count = attempt_count + 1, updated_at = ?
        WHERE id = ? AND method = 'sms_declaration' AND status = 'pending'
        """, attemptedAt, id);
  }

  @Override
  public boolean markVerified(UUID id, Instant verifiedAt) {
    return jdbc.update("""
        UPDATE verification_sessions SET status = 'verified', challenge_hash = '', updated_at = ?
        WHERE id = ? AND method = 'sms_declaration' AND status = 'pending'
          AND sent_at IS NOT NULL AND attempt_count < 5 AND expires_at > ?
        """, verifiedAt, id, verifiedAt) == 1;
  }

  @Override
  public CustomerProfile findBySubject(String subject) {
    return jdbc.query("SELECT * FROM customer_profiles WHERE cognito_subject = ?", this::mapProfile, subject)
        .stream().findFirst().orElse(null);
  }

  @Override
  public CustomerProfile findByPhone(String phone) {
    if (phone == null || phone.isBlank()) {
      return null;
    }
    return jdbc.query("""
        SELECT * FROM customer_profiles
        WHERE phone = ? AND status <> 'deleted' LIMIT 1
        """, this::mapProfile, phone).stream().findFirst().orElse(null);
  }

  @Override
  public CustomerProfile findByCiFingerprint(String fingerprint) {
    if (fingerprint == null || fingerprint.isBlank()) {
      return null;
    }
    return jdbc.query("""
        SELECT p.* FROM customer_profiles p
        JOIN identity_verifications v ON v.customer_id = p.customer_id
        WHERE v.ci_fingerprint = ? AND p.status <> 'deleted'
        ORDER BY v.verified_at DESC LIMIT 1
        """, this::mapProfile, fingerprint).stream().findFirst().orElse(null);
  }

  @Override
  @Transactional
  public CustomerProfile createFromVerification(String subject, VerificationSession verification) {
    var existing = findBySubject(subject);
    if (existing != null) {
      return existing;
    }
    if (!verification.ciFingerprint().isBlank() && findByCiFingerprint(verification.ciFingerprint()) != null) {
      throw new IllegalStateException("An account already exists for this verified identity");
    }
    if (!verification.phone().isBlank() && findByPhone(verification.phone()) != null) {
      throw new IllegalStateException("An account already exists for this verified phone");
    }
    var customerId = UUID.randomUUID();
    var isEmail = "email_declaration".equals(verification.method());
    jdbc.update("""
        INSERT INTO customer_profiles (
          customer_id, cognito_subject, status, legal_name, display_name, phone, email,
          locale, country, organization, team, verification_method, verified_at,
          adult_verified, session_version, sessions_valid_after, created_at, updated_at
        ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, '', '', ?, now(), true, 1,
          to_timestamp(0), now(), now())
        """, customerId, subject, verification.legalName(), verification.legalName(),
        verification.phone(), isEmail ? verification.identifier() : "", verification.locale(),
        isEmail ? "overseas" : "KR", verification.method());
    jdbc.update("""
        INSERT INTO identity_verifications (
          id, customer_id, method, identifier_snapshot, ci_fingerprint,
          adult_verified, verified_at, created_at
        ) VALUES (?, ?, ?, ?, ?, true, now(), now())
        """, UUID.randomUUID(), customerId, verification.method(), mask(verification.identifier()),
        verification.ciFingerprint());
    jdbc.update("""
        INSERT INTO consent_receipts (
          id, customer_id, terms_version, privacy_version, marketing_consent, consented_at
        ) VALUES (?, ?, ?, ?, ?, now())
        """, UUID.randomUUID(), customerId, verification.termsVersion(),
        verification.privacyVersion(), verification.marketingConsent());
    audit(customerId, "account_created", "system");
    return findBySubject(subject);
  }

  @Override
  public CustomerProfile update(String subject, String displayName, String email, String organization, String team, String locale) {
    jdbc.update("""
        UPDATE customer_profiles SET display_name = ?, email = ?, organization = ?, team = ?,
          locale = ?, updated_at = now() WHERE cognito_subject = ? AND status = 'active'
        """, displayName, email, organization, team, locale, subject);
    var profile = findBySubject(subject);
    if (profile != null) {
      audit(profile.customerId(), "profile_updated", subject);
    }
    return profile;
  }

  @Override
  public CustomerProfile markDeletionPending(String subject) {
    jdbc.update("""
        UPDATE customer_profiles SET status = 'deletion_pending', deletion_requested_at = now(),
          session_version = session_version + 1, sessions_valid_after = now(), updated_at = now()
        WHERE cognito_subject = ? AND status = 'active'
        """, subject);
    var profile = findBySubject(subject);
    if (profile != null) {
      audit(profile.customerId(), "deletion_requested", subject);
    }
    return profile;
  }

  @Override
  public CustomerProfile incrementSessionVersion(String subject) {
    jdbc.update("""
        UPDATE customer_profiles SET session_version = session_version + 1,
          sessions_valid_after = now(), updated_at = now()
        WHERE cognito_subject = ? AND status = 'active'
        """, subject);
    return findBySubject(subject);
  }

  @Override
  public CustomerProfile updateStatus(UUID customerId, String status, String actor) {
    if (!"active".equals(status) && !"suspended".equals(status)) {
      throw new IllegalArgumentException("Unsupported customer status transition");
    }
    var existing = jdbc.query("SELECT * FROM customer_profiles WHERE customer_id = ?", this::mapProfile, customerId)
        .stream().findFirst().orElse(null);
    if (existing == null) {
      return null;
    }
    if (status.equals(existing.status())) {
      return existing;
    }
    var updated = jdbc.update("""
        UPDATE customer_profiles SET status = ?, session_version = session_version + 1,
          sessions_valid_after = now(), updated_at = now()
        WHERE customer_id = ? AND status IN ('active', 'suspended')
        """, status, customerId);
    if (updated != 1) {
      return null;
    }
    audit(customerId, "customer_" + status, actor);
    return jdbc.query("SELECT * FROM customer_profiles WHERE customer_id = ?", this::mapProfile, customerId)
        .stream().findFirst().orElse(null);
  }

  @Override
  @Transactional
  public int anonymizeDeletionPendingBefore(Instant cutoff) {
    var customerIds = jdbc.queryForList("""
        SELECT customer_id FROM customer_profiles
        WHERE status = 'deletion_pending' AND deletion_requested_at < ?
        """, UUID.class, cutoff);
    for (var customerId : customerIds) {
      jdbc.update("DELETE FROM identity_verifications WHERE customer_id = ?", customerId);
      jdbc.update("DELETE FROM consent_receipts WHERE customer_id = ?", customerId);
      jdbc.update("""
          UPDATE customer_profiles SET cognito_subject = ?, status = 'deleted', legal_name = '',
            display_name = '', phone = '', email = '', locale = 'ko', country = '',
            organization = '', team = '', adult_verified = false,
            session_version = session_version + 1, sessions_valid_after = now(), updated_at = now()
          WHERE customer_id = ? AND status = 'deletion_pending'
          """, "deleted:" + customerId, customerId);
      audit(customerId, "customer_personal_data_deleted", "scheduled-cleanup");
    }
    return customerIds.size();
  }

  @Override
  public List<UUID> findCustomersAwaitingInquiryUnlink(int limit) {
    return jdbc.queryForList("""
        SELECT customer_id FROM customer_profiles
        WHERE status = 'deleted' AND inquiries_unlinked_at IS NULL
        ORDER BY updated_at ASC LIMIT ?
        """, UUID.class, Math.min(Math.max(limit, 1), 500));
  }

  @Override
  @Transactional
  public void markInquiriesUnlinked(UUID customerId) {
    var updated = jdbc.update("""
        UPDATE customer_profiles SET inquiries_unlinked_at = now(), updated_at = now()
        WHERE customer_id = ? AND status = 'deleted' AND inquiries_unlinked_at IS NULL
        """, customerId);
    if (updated == 1) {
      audit(customerId, "retained_inquiries_unlinked", "scheduled-cleanup");
    }
  }

  @Override
  public List<CustomerProfile> search(String query, int limit) {
    var needle = "%" + (query == null ? "" : query.trim().toLowerCase()) + "%";
    return jdbc.query("""
        SELECT * FROM customer_profiles
        WHERE lower(display_name) LIKE ? OR lower(email) LIKE ? OR phone LIKE ?
          OR lower(customer_id::text) LIKE ?
        ORDER BY created_at DESC LIMIT ?
        """, this::mapProfile, needle, needle, needle, needle, Math.min(Math.max(limit, 1), 100));
  }

  private void audit(UUID customerId, String eventType, String actor) {
    jdbc.update("""
        INSERT INTO account_audit_events (id, customer_id, event_type, actor, metadata_json, created_at)
        VALUES (?, ?, ?, ?, '{}'::jsonb, now())
        """, UUID.randomUUID(), customerId, eventType, actor);
  }

  private CustomerProfile mapProfile(ResultSet rs, int rowNum) throws SQLException {
    return new CustomerProfile(
        rs.getObject("customer_id", UUID.class), rs.getString("cognito_subject"), rs.getString("status"),
        rs.getString("legal_name"), rs.getString("display_name"), rs.getString("phone"),
        rs.getString("email"), rs.getString("locale"), rs.getString("country"),
        rs.getString("organization"), rs.getString("team"), rs.getString("verification_method"),
        instant(rs, "verified_at"), rs.getBoolean("adult_verified"), rs.getLong("session_version"),
        instant(rs, "sessions_valid_after"), instant(rs, "created_at"), instant(rs, "updated_at")
    );
  }

  private VerificationSession mapVerification(ResultSet rs, int rowNum) throws SQLException {
    return new VerificationSession(
        rs.getObject("id", UUID.class), rs.getString("method"), rs.getString("identifier"),
        rs.getString("legal_name"), rs.getString("phone"), rs.getString("ci_fingerprint"),
        rs.getBoolean("adult_verified"), rs.getString("locale"), rs.getString("terms_version"),
        rs.getString("privacy_version"), rs.getBoolean("marketing_consent"), rs.getString("status"),
        rs.getString("grant_hash"), instant(rs, "grant_expires_at"), instant(rs, "expires_at"),
        instant(rs, "consumed_at")
    );
  }

  private Instant instant(ResultSet rs, String column) throws SQLException {
    var value = rs.getObject(column, OffsetDateTime.class);
    return value == null ? null : value.toInstant();
  }

  private String mask(String value) {
    if (value == null || value.length() < 4) {
      return "***";
    }
    return value.substring(0, 2) + "***" + value.substring(value.length() - 2);
  }
}
