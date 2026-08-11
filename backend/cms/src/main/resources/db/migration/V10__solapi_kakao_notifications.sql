-- A provider cutover must never reuse legacy template codes, message IDs, or
-- an old enabled switch. SOLAPI is re-enabled only after a final CMS test
-- delivery succeeds for every active Korean template.
ALTER TABLE cms_notification_jobs
  ADD COLUMN IF NOT EXISTS retry_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_fingerprint text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS cms_kakao_template_verifications (
  template_key text PRIMARY KEY,
  verification_fingerprint text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);

-- Verification state is provider/configuration-specific. A provider cutover
-- always requires fresh final-delivery tests.
DELETE FROM cms_kakao_template_verifications;

UPDATE cms_notification_settings
SET kakao_enabled = false,
    updated_at = now();

UPDATE cms_notification_templates
SET is_active = false,
    updated_at = now()
WHERE channel = 'kakao'
  AND is_active = true;

UPDATE cms_notification_jobs
SET status = 'needs_attention',
    retry_blocked = true,
    last_error = CASE
      WHEN last_error = '' THEN 'Kakao provider changed to SOLAPI; this legacy job cannot be retried.'
      ELSE last_error || ' | Kakao provider changed to SOLAPI; this legacy job cannot be retried.'
    END,
    updated_at = now()
WHERE channel = 'kakao'
  AND status IN ('queued', 'processing', 'provider_pending', 'failed', 'needs_attention');

DELETE FROM cms_notification_templates
WHERE template_key IN (
  'customer_contacted_kakao_en',
  'customer_in_progress_kakao_en',
  'customer_done_kakao_en'
)
  AND provider_template_code = ''
  AND approval_status = 'draft'
  AND is_active = false;

-- Keep email and Kakao wording consistent for customers who supplied both.
UPDATE cms_notification_templates
SET is_active = false,
    updated_at = now()
WHERE template_key IN (
  'customer_contacted_email_ko',
  'customer_contacted_email_en'
)
  AND is_active = true;

INSERT INTO cms_notification_templates (
  id, template_key, channel, audience, event_type, inquiry_status, locale, version,
  subject, body, provider_template_code, approval_status, is_active
)
SELECT
  'template-customer-contacted-email-ko-solapi-v' || next.version,
  'customer_contacted_email_ko', 'email', 'customer', 'status_changed', 'contacted', 'ko', next.version,
  '[DAEHO] 연락 완료 안내',
  E'{{name}}님, 안녕하세요.\n\n문의 담당자가 고객님께 연락드렸습니다.\n\n문의 ID: {{inquiry_id}}\n현재 상태: {{status_label}}\n\n감사합니다.\nDAEHO',
  '', 'approved', true
FROM (
  SELECT COALESCE(MAX(version), 0) + 1 AS version
  FROM cms_notification_templates
  WHERE template_key = 'customer_contacted_email_ko'
) next;

INSERT INTO cms_notification_templates (
  id, template_key, channel, audience, event_type, inquiry_status, locale, version,
  subject, body, provider_template_code, approval_status, is_active
)
SELECT
  'template-customer-contacted-email-en-solapi-v' || next.version,
  'customer_contacted_email_en', 'email', 'customer', 'status_changed', 'contacted', 'en', next.version,
  '[DAEHO] We contacted you',
  E'Hello {{name}},\n\nA member of our team has contacted you about your inquiry.\n\nInquiry ID: {{inquiry_id}}\nCurrent status: {{status_label}}\n\nThank you,\nDAEHO',
  '', 'approved', true
FROM (
  SELECT COALESCE(MAX(version), 0) + 1 AS version
  FROM cms_notification_templates
  WHERE template_key = 'customer_contacted_email_en'
) next;

INSERT INTO cms_notification_templates (
  id, template_key, channel, audience, event_type, inquiry_status, locale, version,
  subject, body, provider_template_code, approval_status, is_active
)
SELECT
  'template-customer-contacted-kakao-ko-solapi-v' || next.version,
  'customer_contacted_kakao_ko', 'kakao', 'customer', 'status_changed', 'contacted', 'ko', next.version, '',
  E'[대호 브리아노 문의 상태 안내]\n\n{{name}}님, 문의 담당자가 고객님께 연락드렸습니다.\n\n문의 번호: {{inquiry_id}}\n현재 상태: 연락 완료\n\n감사합니다.\n대호 브리아노',
  '', 'draft', false
FROM (
  SELECT COALESCE(MAX(version), 0) + 1 AS version
  FROM cms_notification_templates
  WHERE template_key = 'customer_contacted_kakao_ko'
) next;

INSERT INTO cms_notification_templates (
  id, template_key, channel, audience, event_type, inquiry_status, locale, version,
  subject, body, provider_template_code, approval_status, is_active
)
SELECT
  'template-customer-progress-kakao-ko-solapi-v' || next.version,
  'customer_in_progress_kakao_ko', 'kakao', 'customer', 'status_changed', 'in_progress', 'ko', next.version, '',
  E'[대호 브리아노 문의 상태 안내]\n\n{{name}}님, 보내주신 문의를 현재 처리하고 있습니다.\n\n문의 번호: {{inquiry_id}}\n현재 상태: 진행 중\n\n처리가 완료되면 다시 안내드리겠습니다.\n\n감사합니다.\n대호 브리아노',
  '', 'draft', false
FROM (
  SELECT COALESCE(MAX(version), 0) + 1 AS version
  FROM cms_notification_templates
  WHERE template_key = 'customer_in_progress_kakao_ko'
) next;

INSERT INTO cms_notification_templates (
  id, template_key, channel, audience, event_type, inquiry_status, locale, version,
  subject, body, provider_template_code, approval_status, is_active
)
SELECT
  'template-customer-done-kakao-ko-solapi-v' || next.version,
  'customer_done_kakao_ko', 'kakao', 'customer', 'status_changed', 'done', 'ko', next.version, '',
  E'[대호 브리아노 문의 상태 안내]\n\n{{name}}님, 보내주신 문의 처리가 완료되었습니다.\n\n문의 번호: {{inquiry_id}}\n현재 상태: 처리 완료\n\n추가 문의가 있으시면 대호 브리아노 카카오톡 채널로 연락해 주세요.\n\n감사합니다.\n대호 브리아노',
  '', 'draft', false
FROM (
  SELECT COALESCE(MAX(version), 0) + 1 AS version
  FROM cms_notification_templates
  WHERE template_key = 'customer_done_kakao_ko'
) next;
