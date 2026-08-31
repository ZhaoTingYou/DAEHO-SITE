ALTER TABLE cms_notification_settings
  ADD COLUMN IF NOT EXISTS telegram_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE cms_notification_templates
  DROP CONSTRAINT IF EXISTS cms_notification_templates_channel_check;

ALTER TABLE cms_notification_templates
  ADD CONSTRAINT cms_notification_templates_channel_check
  CHECK (channel IN ('email', 'kakao', 'telegram'));

ALTER TABLE cms_notification_jobs
  DROP CONSTRAINT IF EXISTS cms_notification_jobs_channel_check;

ALTER TABLE cms_notification_jobs
  ADD CONSTRAINT cms_notification_jobs_channel_check
  CHECK (channel IN ('email', 'kakao', 'telegram'));

INSERT INTO cms_notification_templates (
  id, template_key, channel, audience, event_type, inquiry_status, locale, version,
  subject, body, provider_template_code, kakao_template_type, approval_status,
  is_active, created_at, updated_at
) VALUES (
  'template-internal-new-telegram-ko-v1',
  'internal_new_telegram_ko',
  'telegram',
  'internal',
  'new_inquiry',
  '',
  'ko',
  1,
  '',
  E'🔔 DAEHO 새 문의\n\n문의 번호: {{inquiry_id}}\n문의 유형: {{inquiry_type}}\n고객명: {{name}}\n회사/단체: {{organization}}\n팀: {{team}}\n전화: {{phone}}\n이메일: {{email}}\n수량: {{quantity}}\n희망일: {{due_date}}\n요청 용도: {{use_case}}\n문의 내용: {{message}}\n\nCMS 상세: {{admin_url}}',
  '',
  'basic',
  'approved',
  true,
  now(),
  now()
)
ON CONFLICT (template_key, version) DO NOTHING;
