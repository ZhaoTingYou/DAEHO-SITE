package com.daeho.customer.repository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class LegacyClaimRepository {
  private final JdbcTemplate jdbc;
  private final byte[] secret;

  public LegacyClaimRepository(
      JdbcTemplate jdbc,
      @Value("${customer.verification-hmac-secret:disabled-mode-placeholder-secret}") String secret) {
    this.jdbc = jdbc;
    this.secret = secret.getBytes(StandardCharsets.UTF_8);
  }

  @Transactional
  public Map<String, Object> create(UUID customerId, String inquiryId, String contact) {
    var id = UUID.randomUUID();
    var created = jdbc.update("""
        INSERT INTO legacy_inquiry_claims (
          id, customer_id, inquiry_id, contact_fingerprint, contact_hint,
          status, link_state, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', 'not_linked', now(), now())
        ON CONFLICT (customer_id, inquiry_id) DO NOTHING
        """, id, customerId, clean(inquiryId), fingerprint(contact), contactHint(contact));
    if (created == 1) {
      jdbc.update("""
        INSERT INTO account_audit_events (id, customer_id, event_type, actor, metadata_json, created_at)
        VALUES (?, ?, 'legacy_claim_submitted', ?, jsonb_build_object('claimId', ?, 'inquiryId', ?), now())
        """, UUID.randomUUID(), customerId, customerId.toString(), id.toString(), clean(inquiryId));
    }
    return findByCustomerAndInquiry(customerId, inquiryId);
  }

  public List<Map<String, Object>> listPending() {
    return jdbc.query("""
        SELECT id, customer_id, inquiry_id, contact_hint, match_result, status, link_state,
          reviewer, review_reason,
          reviewed_at, created_at, updated_at
        FROM legacy_inquiry_claims WHERE status = 'pending' ORDER BY created_at ASC
        """, (rs, row) -> Map.ofEntries(
            Map.entry("id", rs.getObject("id", UUID.class)),
            Map.entry("customerId", rs.getObject("customer_id", UUID.class)),
            Map.entry("inquiryId", rs.getString("inquiry_id")),
            Map.entry("contactHint", rs.getString("contact_hint")),
            Map.entry("matchResult", rs.getString("match_result")),
            Map.entry("status", rs.getString("status")),
            Map.entry("linkState", rs.getString("link_state")),
            Map.entry("reviewer", rs.getString("reviewer")),
            Map.entry("reviewReason", rs.getString("review_reason")),
            Map.entry("reviewedAt", instant(rs.getObject("reviewed_at", OffsetDateTime.class))),
            Map.entry("createdAt", instant(rs.getObject("created_at", OffsetDateTime.class))),
            Map.entry("updatedAt", instant(rs.getObject("updated_at", OffsetDateTime.class)))
        ));
  }

  @Transactional
  public Map<String, Object> review(UUID id, String status, String reviewer, String reason) {
    if (!"approved".equals(status) && !"rejected".equals(status)) {
      throw new IllegalArgumentException("Claim status must be approved or rejected");
    }
    var rows = jdbc.queryForList("SELECT customer_id, inquiry_id FROM legacy_inquiry_claims WHERE id = ?", id);
    if (rows.isEmpty()) {
      return Map.of();
    }
    var customerId = (UUID) rows.get(0).get("customer_id");
    var inquiryId = clean(String.valueOf(rows.get(0).get("inquiry_id")));
    var updated = jdbc.update("""
        UPDATE legacy_inquiry_claims SET status = ?, reviewer = ?, review_reason = ?,
          link_state = CASE WHEN ? = 'approved' THEN 'pending' ELSE 'not_linked' END,
          reviewed_at = now(), updated_at = now() WHERE id = ? AND status = 'pending'
        """, status, clean(reviewer), clean(reason), status, id);
    if (updated != 1) {
      return listForCustomer(customerId).stream()
          .filter(item -> id.equals(item.get("id"))).findFirst().orElse(Map.of());
    }
    jdbc.update("""
        INSERT INTO account_audit_events (id, customer_id, event_type, actor, metadata_json, created_at)
        VALUES (?, ?, ?, ?, jsonb_build_object('claimId', ?, 'inquiryId', ?), now())
        """, UUID.randomUUID(), customerId, "legacy_claim_" + status, clean(reviewer),
        id.toString(), inquiryId);
    return listForCustomer(customerId).stream()
        .filter(item -> id.equals(item.get("id"))).findFirst().orElse(Map.of());
  }

  public List<Map<String, Object>> listForCustomer(UUID customerId) {
    return jdbc.query("""
        SELECT id, inquiry_id, contact_hint, match_result, status, link_state,
          reviewer, review_reason, reviewed_at, created_at, updated_at
        FROM legacy_inquiry_claims WHERE customer_id = ? ORDER BY created_at DESC
        """, (rs, row) -> Map.ofEntries(
            Map.entry("id", rs.getObject("id", UUID.class)),
            Map.entry("inquiryId", rs.getString("inquiry_id")),
            Map.entry("contactHint", rs.getString("contact_hint")),
            Map.entry("matchResult", rs.getString("match_result")),
            Map.entry("status", rs.getString("status")),
            Map.entry("linkState", rs.getString("link_state")),
            Map.entry("reviewer", rs.getString("reviewer")),
            Map.entry("reviewReason", rs.getString("review_reason")),
            Map.entry("reviewedAt", instant(rs.getObject("reviewed_at", OffsetDateTime.class))),
            Map.entry("createdAt", instant(rs.getObject("created_at", OffsetDateTime.class))),
            Map.entry("updatedAt", instant(rs.getObject("updated_at", OffsetDateTime.class)))
        ), customerId);
  }

  private Map<String, Object> findByCustomerAndInquiry(UUID customerId, String inquiryId) {
    return listForCustomer(customerId).stream()
        .filter(item -> clean(inquiryId).equals(item.get("inquiryId")))
        .findFirst().orElse(Map.of());
  }

  public void recordMatchResult(UUID id, UUID customerId, String result) {
    var allowed = Set.of(
        "exact_match", "contact_mismatch", "not_found", "already_linked",
        "linked_to_another_customer", "conflict");
    if (!allowed.contains(result)) {
      result = "conflict";
    }
    jdbc.update("""
        UPDATE legacy_inquiry_claims SET match_result = ?, updated_at = now()
        WHERE id = ? AND customer_id = ? AND status = 'pending'
        """, result, id, customerId);
  }

  public List<Map<String, Object>> listApprovedAwaitingLink(int limit) {
    return jdbc.query("""
        SELECT id, customer_id, inquiry_id FROM legacy_inquiry_claims
        WHERE status = 'approved' AND link_state = 'pending'
          AND EXISTS (SELECT 1 FROM customer_profiles p
            WHERE p.customer_id = legacy_inquiry_claims.customer_id AND p.status = 'active')
        ORDER BY reviewed_at ASC LIMIT ?
        """, (rs, row) -> Map.of(
            "id", rs.getObject("id", UUID.class),
            "customerId", rs.getObject("customer_id", UUID.class),
            "inquiryId", rs.getString("inquiry_id")
        ), Math.min(Math.max(limit, 1), 100));
  }

  @Transactional
  public void markLinked(UUID id) {
    var rows = jdbc.queryForList("""
        SELECT customer_id, inquiry_id FROM legacy_inquiry_claims
        WHERE id = ? AND status = 'approved' AND link_state = 'pending'
        """, id);
    if (rows.isEmpty()) {
      return;
    }
    var customerId = (UUID) rows.get(0).get("customer_id");
    var inquiryId = clean(String.valueOf(rows.get(0).get("inquiry_id")));
    var updated = jdbc.update("""
        UPDATE legacy_inquiry_claims SET link_state = 'linked', updated_at = now()
        WHERE id = ? AND status = 'approved' AND link_state = 'pending'
        """, id);
    if (updated == 1) {
      jdbc.update("""
          INSERT INTO account_audit_events (id, customer_id, event_type, actor, metadata_json, created_at)
          VALUES (?, ?, 'legacy_claim_linked', 'claim-reconciler',
            jsonb_build_object('claimId', ?, 'inquiryId', ?), now())
          """, UUID.randomUUID(), customerId, id.toString(), inquiryId);
    }
  }

  private String fingerprint(String value) {
    try {
      var digest = MessageDigest.getInstance("SHA-256");
      digest.update(secret);
      return HexFormat.of().formatHex(digest.digest(clean(value).toLowerCase().getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) {
      throw new IllegalStateException(error);
    }
  }

  private String contactHint(String value) {
    var text = clean(value).toLowerCase();
    if (text.contains("@")) {
      var parts = text.split("@", 2);
      return (parts[0].isBlank() ? "*" : parts[0].substring(0, 1)) + "***@" + parts[1];
    }
    var digits = text.replaceAll("[^0-9]", "");
    return digits.length() < 4 ? "***" : "***" + digits.substring(digits.length() - 4);
  }

  private String clean(String value) {
    return value == null ? "" : value.trim();
  }

  private String instant(OffsetDateTime value) {
    return value == null ? "" : value.toInstant().toString();
  }
}
