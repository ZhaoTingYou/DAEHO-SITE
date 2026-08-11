package com.daeho.cms.repository;

import com.daeho.cms.service.RequestValidation;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class NotificationRepository {
  public static final long DISPATCH_LOCK_ID = 4_443_393_995_712_001L;
  private final JdbcTemplate jdbc;
  private final RequestValidation validation;

  public NotificationRepository(JdbcTemplate jdbc, RequestValidation validation) {
    this.jdbc = jdbc;
    this.validation = validation;
  }

  public boolean notificationSchemaReady() {
    var ready = jdbc.queryForObject(
        "SELECT to_regclass('public.cms_notification_jobs') IS NOT NULL",
        Boolean.class
    );
    return Boolean.TRUE.equals(ready);
  }

  public void lockNotificationDispatch() {
    jdbc.query("SELECT pg_advisory_xact_lock(?)", rs -> null, DISPATCH_LOCK_ID);
  }

  public Map<String, Object> getSettings(String fallbackInternalEmail) {
    jdbc.update("""
        INSERT INTO cms_notification_settings (
          id, internal_email, internal_email_enabled, customer_email_enabled, kakao_enabled, updated_at
        ) VALUES ('default', ?, false, false, false, now())
        ON CONFLICT (id) DO UPDATE SET
          internal_email = CASE
            WHEN cms_notification_settings.internal_email = '' THEN excluded.internal_email
            ELSE cms_notification_settings.internal_email
          END
        """, validation.stringValue(fallbackInternalEmail));
    return jdbc.query(
        "SELECT * FROM cms_notification_settings WHERE id = 'default'",
        this::mapSettings
    ).stream().findFirst().orElse(Map.of());
  }

  @Transactional
  public Map<String, Object> updateSettings(Map<String, Object> payload) {
    jdbc.update("""
        INSERT INTO cms_notification_settings (
          id, internal_email, internal_email_enabled, customer_email_enabled, kakao_enabled, updated_at
        ) VALUES ('default', ?, ?, ?, ?, now())
        ON CONFLICT (id) DO UPDATE SET
          internal_email = excluded.internal_email,
          internal_email_enabled = excluded.internal_email_enabled,
          customer_email_enabled = excluded.customer_email_enabled,
          kakao_enabled = excluded.kakao_enabled,
          updated_at = now()
        """,
        validation.stringValue(payload.get("internalEmail")),
        validation.booleanValue(payload.get("internalEmailEnabled"), false),
        validation.booleanValue(payload.get("customerEmailEnabled"), false),
        validation.booleanValue(payload.get("kakaoEnabled"), false)
    );
    return jdbc.query(
        "SELECT * FROM cms_notification_settings WHERE id = 'default'",
        this::mapSettings
    ).stream().findFirst().orElse(Map.of());
  }

  public boolean kakaoTemplateVerified(String templateKey, String fingerprint) {
    var verified = jdbc.queryForObject("""
        SELECT EXISTS (
          SELECT 1
          FROM cms_kakao_template_verifications
          WHERE template_key = ? AND verification_fingerprint = ?
        )
        """, Boolean.class, validation.stringValue(templateKey), validation.stringValue(fingerprint));
    return Boolean.TRUE.equals(verified);
  }

  public void markKakaoTemplateVerified(String templateKey, String fingerprint) {
    jdbc.update("""
        INSERT INTO cms_kakao_template_verifications (
          template_key, verification_fingerprint, verified_at
        ) VALUES (?, ?, now())
        ON CONFLICT (template_key) DO UPDATE SET
          verification_fingerprint = excluded.verification_fingerprint,
          verified_at = now()
        """, validation.stringValue(templateKey), validation.stringValue(fingerprint));
  }

  public boolean kakaoJobTemplateVerified(String jobId) {
    var verified = jdbc.queryForObject("""
        SELECT EXISTS (
          SELECT 1
          FROM cms_notification_jobs job
          INNER JOIN cms_notification_templates template ON template.id = job.template_id
          INNER JOIN cms_kakao_template_verifications verification
            ON verification.template_key = template.template_key
           AND verification.verification_fingerprint = job.verification_fingerprint
          WHERE job.id = ? AND job.verification_fingerprint <> ''
        )
        """, Boolean.class, validation.stringValue(jobId));
    return Boolean.TRUE.equals(verified);
  }

  public List<Map<String, Object>> listTemplates() {
    return jdbc.query("""
        SELECT * FROM cms_notification_templates
        ORDER BY template_key ASC, version DESC
        """, this::mapTemplate);
  }

  public Map<String, Object> getLatestTemplate(String templateKey) {
    return jdbc.query("""
        SELECT * FROM cms_notification_templates
        WHERE template_key = ?
        ORDER BY version DESC
        LIMIT 1
        """, this::mapTemplate, templateKey).stream().findFirst().orElse(null);
  }

  public Map<String, Object> getActiveTemplate(String templateKey) {
    return jdbc.query("""
        SELECT * FROM cms_notification_templates
        WHERE template_key = ? AND is_active = true
        ORDER BY version DESC
        LIMIT 1
        """, this::mapTemplate, templateKey).stream().findFirst().orElse(null);
  }

  @Transactional
  public Map<String, Object> createTemplateVersion(
      String templateKey,
      Map<String, Object> base,
      Map<String, Object> payload
  ) {
    var nextVersion = validation.intValue(base.get("version"), 0) + 1;
    var id = UUID.randomUUID().toString();
    var approvalStatus = validation.stringValue(payload.get("approvalStatus"));
    var activate = validation.booleanValue(payload.get("isActive"), false);
    var kakaoActivation = activate && "kakao".equals(validation.stringValue(base.get("channel")));
    if (kakaoActivation) {
      lockNotificationDispatch();
      jdbc.update("UPDATE cms_notification_settings SET kakao_enabled = false, updated_at = now()");
      jdbc.update(
          "DELETE FROM cms_kakao_template_verifications WHERE template_key = ?",
          templateKey
      );
      jdbc.update("""
          UPDATE cms_notification_jobs
          SET status = 'needs_attention',
            retry_blocked = true,
            last_error = CASE
              WHEN last_error = '' THEN 'Kakao template changed; this queued job cannot be retried.'
              ELSE last_error || ' | Kakao template changed; this queued job cannot be retried.'
            END,
            updated_at = now()
          WHERE channel = 'kakao'
            AND status IN ('queued', 'processing', 'provider_pending', 'failed', 'needs_attention')
          """);
    }
    if (activate) {
      jdbc.update(
          "UPDATE cms_notification_templates SET is_active = false, updated_at = now() WHERE template_key = ?",
          templateKey
      );
    }
    jdbc.update("""
        INSERT INTO cms_notification_templates (
          id, template_key, channel, audience, event_type, inquiry_status, locale,
          version, subject, body, provider_template_code, approval_status,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
        """,
        id,
        templateKey,
        base.get("channel"),
        base.get("audience"),
        base.get("eventType"),
        base.get("inquiryStatus"),
        base.get("locale"),
        nextVersion,
        validation.stringValue(payload.get("subject")),
        validation.stringValue(payload.get("body")),
        validation.stringValue(payload.get("providerTemplateCode")),
        approvalStatus,
        activate
    );
    return getLatestTemplate(templateKey);
  }

  @Transactional
  public Map<String, Object> createStatusEvent(
      String inquiryId,
      String previousStatus,
      String nextStatus
  ) {
    var id = UUID.randomUUID().toString();
    jdbc.update("""
        INSERT INTO cms_inquiry_status_events (
          id, inquiry_id, previous_status, next_status, actor, created_at
        ) VALUES (?, ?, ?, ?, 'admin', now())
        """, id, inquiryId, previousStatus, nextStatus);
    return getStatusEvent(id);
  }

  public Map<String, Object> getStatusEvent(String id) {
    return jdbc.query(
        "SELECT * FROM cms_inquiry_status_events WHERE id = ?",
        this::mapStatusEvent,
        id
    ).stream().findFirst().orElse(null);
  }

  public List<Map<String, Object>> listStatusEvents(String inquiryId) {
    return jdbc.query("""
        SELECT * FROM cms_inquiry_status_events
        WHERE inquiry_id = ?
        ORDER BY created_at DESC
        """, this::mapStatusEvent, inquiryId);
  }

  @Transactional
  public Map<String, Object> createJob(Map<String, Object> job) {
    var id = UUID.randomUUID().toString();
    jdbc.update("""
        INSERT INTO cms_notification_jobs (
          id, inquiry_id, status_event_id, channel, audience, event_type,
          inquiry_status, locale, recipient, subject, rendered_body, template_id,
          provider_template_code, verification_fingerprint, status, attempt_count, delivery_check_count,
          next_attempt_at, provider_message_id, last_error, dedupe_key,
          created_at, updated_at
        ) VALUES (?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''),
          ?, ?, ?, 0, 0, now(), '', ?, ?, now(), now())
        ON CONFLICT (dedupe_key) DO NOTHING
        """,
        id,
        job.get("inquiryId"),
        validation.stringValue(job.get("statusEventId")),
        job.get("channel"),
        job.get("audience"),
        job.get("eventType"),
        validation.stringValue(job.get("inquiryStatus")),
        job.get("locale"),
        job.get("recipient"),
        validation.stringValue(job.get("subject")),
        validation.stringValue(job.get("renderedBody")),
        validation.stringValue(job.get("templateId")),
        validation.stringValue(job.get("providerTemplateCode")),
        validation.stringValue(job.get("verificationFingerprint")),
        validation.stringValue(job.getOrDefault("status", "queued")),
        validation.stringValue(job.get("lastError")),
        job.get("dedupeKey")
    );
    return getJobByDedupeKey(validation.stringValue(job.get("dedupeKey")));
  }

  public Map<String, Object> getJob(String id) {
    return jdbc.query(
        "SELECT * FROM cms_notification_jobs WHERE id = ?",
        this::mapJob,
        id
    ).stream().findFirst().orElse(null);
  }

  public Map<String, Object> getJobByDedupeKey(String dedupeKey) {
    return jdbc.query(
        "SELECT * FROM cms_notification_jobs WHERE dedupe_key = ?",
        this::mapJob,
        dedupeKey
    ).stream().findFirst().orElse(null);
  }

  public List<Map<String, Object>> listJobsForInquiry(String inquiryId) {
    return jdbc.query("""
        SELECT * FROM cms_notification_jobs
        WHERE inquiry_id = ?
        ORDER BY created_at DESC
        """, this::mapJob, inquiryId);
  }

  public List<Map<String, Object>> listAttemptsForInquiry(String inquiryId) {
    return jdbc.query("""
        SELECT a.*
        FROM cms_notification_attempts a
        INNER JOIN cms_notification_jobs j ON j.id = a.job_id
        WHERE j.inquiry_id = ?
        ORDER BY a.created_at DESC
        """, this::mapAttempt, inquiryId);
  }

  @Transactional
  public Map<String, Object> claimNextReadyJob() {
    return jdbc.query("""
        WITH candidate AS (
          SELECT id, status AS claimed_from_status
          FROM cms_notification_jobs
          WHERE status IN ('queued', 'failed', 'provider_pending')
            AND retry_blocked = false
            AND next_attempt_at <= now()
          ORDER BY next_attempt_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE cms_notification_jobs AS job
        SET status = 'processing', updated_at = now()
        FROM candidate
        WHERE job.id = candidate.id
        RETURNING job.*, candidate.claimed_from_status
        """, (rs, rowNum) -> {
      var job = mapJob(rs, rowNum);
      job.put("claimedFromStatus", rs.getString("claimed_from_status"));
      return job;
    }).stream().findFirst().orElse(null);
  }

  @Transactional
  public void quarantineStaleProcessingJobs() {
    jdbc.update("""
        UPDATE cms_notification_jobs
        SET status = 'needs_attention',
          retry_blocked = true,
          last_error = CASE
            WHEN last_error = '' THEN 'Dispatch result is uncertain after an interrupted worker; manual review is required.'
            ELSE last_error || ' | Dispatch result is uncertain after an interrupted worker; manual review is required.'
          END,
          updated_at = now()
        WHERE status = 'processing'
          AND updated_at < now() - interval '5 minutes'
        """);
  }

  @Transactional
  public void recordAttempt(
      String jobId,
      int attemptNumber,
      String status,
      String providerMessageId,
      String errorMessage
  ) {
    jdbc.update("""
        INSERT INTO cms_notification_attempts (
          id, job_id, attempt_number, status, provider_message_id, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, now())
        """,
        UUID.randomUUID().toString(),
        jobId,
        attemptNumber,
        status,
        validation.stringValue(providerMessageId),
        validation.stringValue(errorMessage)
    );
  }

  @Transactional
  public void markSent(String id, int attemptCount, String providerMessageId) {
    jdbc.update("""
        UPDATE cms_notification_jobs
        SET status = 'sent', attempt_count = ?, provider_message_id = ?,
          last_error = '', updated_at = now()
        WHERE id = ?
        """, attemptCount, validation.stringValue(providerMessageId), id);
  }

  @Transactional
  public void markProviderPending(String id, int attemptCount, String providerMessageId) {
    jdbc.update("""
        UPDATE cms_notification_jobs
        SET status = 'provider_pending', attempt_count = ?, delivery_check_count = 0,
          provider_message_id = ?, last_error = '', next_attempt_at = now() + interval '5 seconds',
          updated_at = now()
        WHERE id = ?
        """, attemptCount, validation.stringValue(providerMessageId), id);
  }

  @Transactional
  public void scheduleDeliveryCheck(String id, int deliveryCheckCount) {
    var nextStatus = deliveryCheckCount >= 20 ? "needs_attention" : "provider_pending";
    var retryBlocked = deliveryCheckCount >= 20;
    var error = retryBlocked
        ? "Kakao delivery result is uncertain; manual review is required and this message cannot be resent."
        : "";
    jdbc.update("""
        UPDATE cms_notification_jobs
        SET status = ?, delivery_check_count = ?, retry_blocked = CASE WHEN ? THEN true ELSE retry_blocked END,
          last_error = ?,
          next_attempt_at = now() + interval '5 seconds', updated_at = now()
        WHERE id = ?
        """, nextStatus, deliveryCheckCount, retryBlocked, error, id);
  }

  @Transactional
  public void scheduleRetry(String id, int attemptCount, String errorMessage, int delayMinutes) {
    var nextStatus = attemptCount >= 4 ? "needs_attention" : "failed";
    jdbc.update("""
        UPDATE cms_notification_jobs
        SET status = ?, attempt_count = ?, last_error = ?,
          next_attempt_at = now() + (? * interval '1 minute'), updated_at = now()
        WHERE id = ?
        """, nextStatus, attemptCount, validation.stringValue(errorMessage), delayMinutes, id);
  }

  @Transactional
  public void quarantineJob(String id, String errorMessage) {
    jdbc.update("""
        UPDATE cms_notification_jobs
        SET status = 'needs_attention', retry_blocked = true, last_error = ?, updated_at = now()
        WHERE id = ?
        """, validation.stringValue(errorMessage), id);
  }

  @Transactional
  public Map<String, Object> retryJob(String id) {
    jdbc.update("""
        UPDATE cms_notification_jobs
        SET status = 'queued', attempt_count = 0, delivery_check_count = 0,
          next_attempt_at = now(), provider_message_id = '', last_error = '',
          updated_at = now()
        WHERE id = ?
          AND status IN ('failed', 'needs_attention')
          AND retry_blocked = false
        """, id);
    return getJob(id);
  }

  private Map<String, Object> mapSettings(ResultSet rs, int rowNum) throws SQLException {
    return orderedMap(
        "id", rs.getString("id"),
        "internalEmail", rs.getString("internal_email"),
        "internalEmailEnabled", rs.getBoolean("internal_email_enabled"),
        "customerEmailEnabled", rs.getBoolean("customer_email_enabled"),
        "kakaoEnabled", rs.getBoolean("kakao_enabled"),
        "updatedAt", instantString(rs, "updated_at")
    );
  }

  private Map<String, Object> mapTemplate(ResultSet rs, int rowNum) throws SQLException {
    return orderedMap(
        "id", rs.getString("id"),
        "templateKey", rs.getString("template_key"),
        "channel", rs.getString("channel"),
        "audience", rs.getString("audience"),
        "eventType", rs.getString("event_type"),
        "inquiryStatus", rs.getString("inquiry_status"),
        "locale", rs.getString("locale"),
        "version", rs.getInt("version"),
        "subject", rs.getString("subject"),
        "body", rs.getString("body"),
        "providerTemplateCode", rs.getString("provider_template_code"),
        "approvalStatus", rs.getString("approval_status"),
        "isActive", rs.getBoolean("is_active"),
        "createdAt", instantString(rs, "created_at"),
        "updatedAt", instantString(rs, "updated_at")
    );
  }

  private Map<String, Object> mapStatusEvent(ResultSet rs, int rowNum) throws SQLException {
    return orderedMap(
        "id", rs.getString("id"),
        "inquiryId", rs.getString("inquiry_id"),
        "previousStatus", rs.getString("previous_status"),
        "nextStatus", rs.getString("next_status"),
        "actor", rs.getString("actor"),
        "createdAt", instantString(rs, "created_at")
    );
  }

  private Map<String, Object> mapJob(ResultSet rs, int rowNum) throws SQLException {
    return orderedMap(
        "id", rs.getString("id"),
        "inquiryId", rs.getString("inquiry_id"),
        "statusEventId", rs.getString("status_event_id"),
        "channel", rs.getString("channel"),
        "audience", rs.getString("audience"),
        "eventType", rs.getString("event_type"),
        "inquiryStatus", rs.getString("inquiry_status"),
        "locale", rs.getString("locale"),
        "recipient", rs.getString("recipient"),
        "subject", rs.getString("subject"),
        "renderedBody", rs.getString("rendered_body"),
        "templateId", rs.getString("template_id"),
        "providerTemplateCode", rs.getString("provider_template_code"),
        "status", rs.getString("status"),
        "retryBlocked", rs.getBoolean("retry_blocked"),
        "attemptCount", rs.getInt("attempt_count"),
        "deliveryCheckCount", rs.getInt("delivery_check_count"),
        "nextAttemptAt", instantString(rs, "next_attempt_at"),
        "providerMessageId", rs.getString("provider_message_id"),
        "lastError", rs.getString("last_error"),
        "dedupeKey", rs.getString("dedupe_key"),
        "createdAt", instantString(rs, "created_at"),
        "updatedAt", instantString(rs, "updated_at")
    );
  }

  private Map<String, Object> mapAttempt(ResultSet rs, int rowNum) throws SQLException {
    return orderedMap(
        "id", rs.getString("id"),
        "jobId", rs.getString("job_id"),
        "attemptNumber", rs.getInt("attempt_number"),
        "status", rs.getString("status"),
        "providerMessageId", rs.getString("provider_message_id"),
        "errorMessage", rs.getString("error_message"),
        "createdAt", instantString(rs, "created_at")
    );
  }

  private String instantString(ResultSet rs, String column) throws SQLException {
    var value = rs.getObject(column, OffsetDateTime.class);
    return value == null ? "" : value.toInstant().toString();
  }

  private LinkedHashMap<String, Object> orderedMap(Object... values) {
    var map = new LinkedHashMap<String, Object>();
    for (var index = 0; index < values.length; index += 2) {
      map.put(String.valueOf(values[index]), values[index + 1]);
    }
    return map;
  }
}
