ALTER TABLE cms_inquiries
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';

UPDATE cms_inquiries
SET phone = contact
WHERE phone = '' AND contact <> '';

CREATE TABLE IF NOT EXISTS cms_inquiry_status_events (
  id text PRIMARY KEY,
  inquiry_id text NOT NULL,
  previous_status text NOT NULL CHECK (previous_status IN ('new', 'contacted', 'in_progress', 'done', 'spam')),
  next_status text NOT NULL CHECK (next_status IN ('new', 'contacted', 'in_progress', 'done', 'spam')),
  actor text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_cms_inquiry_status_events_inquiry
    FOREIGN KEY (inquiry_id) REFERENCES cms_inquiries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_notification_settings (
  id text PRIMARY KEY,
  internal_email text NOT NULL DEFAULT '',
  internal_email_enabled boolean NOT NULL DEFAULT false,
  customer_email_enabled boolean NOT NULL DEFAULT false,
  kakao_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO cms_notification_settings (
  id, internal_email, internal_email_enabled, customer_email_enabled, kakao_enabled
) VALUES ('default', '', false, false, false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS cms_notification_templates (
  id text PRIMARY KEY,
  template_key text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'kakao')),
  audience text NOT NULL CHECK (audience IN ('internal', 'customer')),
  event_type text NOT NULL CHECK (event_type IN ('new_inquiry', 'status_changed')),
  inquiry_status text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en')),
  version integer NOT NULL CHECK (version > 0),
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  provider_template_code text NOT NULL DEFAULT '',
  approval_status text NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft', 'pending', 'approved')),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_key, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_notification_templates_active
  ON cms_notification_templates (template_key)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS cms_notification_jobs (
  id text PRIMARY KEY,
  inquiry_id text NOT NULL,
  status_event_id text,
  channel text NOT NULL CHECK (channel IN ('email', 'kakao')),
  audience text NOT NULL CHECK (audience IN ('internal', 'customer')),
  event_type text NOT NULL CHECK (event_type IN ('new_inquiry', 'status_changed')),
  inquiry_status text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en')),
  recipient text NOT NULL,
  subject text NOT NULL DEFAULT '',
  rendered_body text NOT NULL,
  template_id text,
  provider_template_code text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'provider_pending', 'sent', 'failed', 'needs_attention')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  delivery_check_count integer NOT NULL DEFAULT 0 CHECK (delivery_check_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text NOT NULL DEFAULT '',
  last_error text NOT NULL DEFAULT '',
  dedupe_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_cms_notification_jobs_inquiry
    FOREIGN KEY (inquiry_id) REFERENCES cms_inquiries(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_notification_jobs_status_event
    FOREIGN KEY (status_event_id) REFERENCES cms_inquiry_status_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_notification_jobs_template
    FOREIGN KEY (template_id) REFERENCES cms_notification_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cms_notification_attempts (
  id text PRIMARY KEY,
  job_id text NOT NULL,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  status text NOT NULL CHECK (status IN ('accepted', 'sent', 'failed')),
  provider_message_id text NOT NULL DEFAULT '',
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_cms_notification_attempts_job
    FOREIGN KEY (job_id) REFERENCES cms_notification_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cms_inquiry_status_events_inquiry
  ON cms_inquiry_status_events (inquiry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cms_notification_jobs_ready
  ON cms_notification_jobs (status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_cms_notification_jobs_inquiry
  ON cms_notification_jobs (inquiry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cms_notification_attempts_job
  ON cms_notification_attempts (job_id, created_at DESC);

INSERT INTO cms_notification_templates (
  id, template_key, channel, audience, event_type, inquiry_status, locale, version,
  subject, body, provider_template_code, approval_status, is_active
) VALUES
  (
    'template-internal-new-email-ko-v1', 'internal_new_email_ko', 'email', 'internal',
    'new_inquiry', '', 'ko', 1,
    '[DAEHO] 새 문의 - {{name}}',
    E'새 문의가 접수되었습니다.\n\n문의 ID: {{inquiry_id}}\n이름: {{name}}\n전화번호: {{phone}}\n이메일: {{email}}\n유형: {{inquiry_type}}\n메시지: {{message}}\n\nCMS: {{admin_url}}',
    '', 'approved', true
  ),
  (
    'template-internal-status-email-ko-v1', 'internal_status_email_ko', 'email', 'internal',
    'status_changed', '', 'ko', 1,
    '[DAEHO] 문의 상태 변경 - {{name}} / {{status_label}}',
    E'문의 상태가 변경되었습니다.\n\n문의 ID: {{inquiry_id}}\n이름: {{name}}\n이전 상태: {{previous_status_label}}\n현재 상태: {{status_label}}\n\nCMS: {{admin_url}}',
    '', 'approved', true
  ),
  (
    'template-customer-contacted-email-ko-v1', 'customer_contacted_email_ko', 'email', 'customer',
    'status_changed', 'contacted', 'ko', 1,
    '[DAEHO] 문의 확인 안내',
    E'{{name}}님, 안녕하세요.\n\n보내주신 문의를 확인했습니다. 담당자가 상담을 위해 연락드릴 예정입니다.\n\n문의 ID: {{inquiry_id}}\n현재 상태: {{status_label}}\n\n감사합니다.\nDAEHO',
    '', 'approved', true
  ),
  (
    'template-customer-contacted-email-en-v1', 'customer_contacted_email_en', 'email', 'customer',
    'status_changed', 'contacted', 'en', 1,
    '[DAEHO] We have reviewed your inquiry',
    E'Hello {{name}},\n\nWe have reviewed your inquiry. A member of our team will contact you shortly.\n\nInquiry ID: {{inquiry_id}}\nCurrent status: {{status_label}}\n\nThank you,\nDAEHO',
    '', 'approved', true
  ),
  (
    'template-customer-progress-email-ko-v1', 'customer_in_progress_email_ko', 'email', 'customer',
    'status_changed', 'in_progress', 'ko', 1,
    '[DAEHO] 문의 진행 안내',
    E'{{name}}님, 안녕하세요.\n\n보내주신 문의가 현재 진행 중입니다.\n\n문의 ID: {{inquiry_id}}\n현재 상태: {{status_label}}\n\n감사합니다.\nDAEHO',
    '', 'approved', true
  ),
  (
    'template-customer-progress-email-en-v1', 'customer_in_progress_email_en', 'email', 'customer',
    'status_changed', 'in_progress', 'en', 1,
    '[DAEHO] Your inquiry is in progress',
    E'Hello {{name}},\n\nYour inquiry is currently in progress.\n\nInquiry ID: {{inquiry_id}}\nCurrent status: {{status_label}}\n\nThank you,\nDAEHO',
    '', 'approved', true
  ),
  (
    'template-customer-done-email-ko-v1', 'customer_done_email_ko', 'email', 'customer',
    'status_changed', 'done', 'ko', 1,
    '[DAEHO] 문의 처리 완료 안내',
    E'{{name}}님, 안녕하세요.\n\n보내주신 문의 처리가 완료되었습니다.\n\n문의 ID: {{inquiry_id}}\n현재 상태: {{status_label}}\n\n추가 문의가 있으시면 회사 이메일로 연락해 주세요.\n감사합니다.\nDAEHO',
    '', 'approved', true
  ),
  (
    'template-customer-done-email-en-v1', 'customer_done_email_en', 'email', 'customer',
    'status_changed', 'done', 'en', 1,
    '[DAEHO] Your inquiry is complete',
    E'Hello {{name}},\n\nYour inquiry has been completed.\n\nInquiry ID: {{inquiry_id}}\nCurrent status: {{status_label}}\n\nPlease contact us by email if you need further assistance.\nThank you,\nDAEHO',
    '', 'approved', true
  ),
  (
    'template-customer-contacted-kakao-ko-v1', 'customer_contacted_kakao_ko', 'kakao', 'customer',
    'status_changed', 'contacted', 'ko', 1, '',
    E'{{name}}님, DAEHO입니다.\n보내주신 문의를 확인했습니다. 담당자가 연락드릴 예정입니다.\n문의 ID: {{inquiry_id}}',
    '', 'draft', false
  ),
  (
    'template-customer-contacted-kakao-en-v1', 'customer_contacted_kakao_en', 'kakao', 'customer',
    'status_changed', 'contacted', 'en', 1, '',
    E'Hello {{name}}, this is DAEHO.\nWe have reviewed your inquiry and will contact you shortly.\nInquiry ID: {{inquiry_id}}',
    '', 'draft', false
  ),
  (
    'template-customer-progress-kakao-ko-v1', 'customer_in_progress_kakao_ko', 'kakao', 'customer',
    'status_changed', 'in_progress', 'ko', 1, '',
    E'{{name}}님, DAEHO입니다.\n보내주신 문의가 현재 진행 중입니다.\n문의 ID: {{inquiry_id}}',
    '', 'draft', false
  ),
  (
    'template-customer-progress-kakao-en-v1', 'customer_in_progress_kakao_en', 'kakao', 'customer',
    'status_changed', 'in_progress', 'en', 1, '',
    E'Hello {{name}}, this is DAEHO.\nYour inquiry is currently in progress.\nInquiry ID: {{inquiry_id}}',
    '', 'draft', false
  ),
  (
    'template-customer-done-kakao-ko-v1', 'customer_done_kakao_ko', 'kakao', 'customer',
    'status_changed', 'done', 'ko', 1, '',
    E'{{name}}님, DAEHO입니다.\n보내주신 문의 처리가 완료되었습니다.\n문의 ID: {{inquiry_id}}',
    '', 'draft', false
  ),
  (
    'template-customer-done-kakao-en-v1', 'customer_done_kakao_en', 'kakao', 'customer',
    'status_changed', 'done', 'en', 1, '',
    E'Hello {{name}}, this is DAEHO.\nYour inquiry has been completed.\nInquiry ID: {{inquiry_id}}',
    '', 'draft', false
  )
ON CONFLICT (template_key, version) DO NOTHING;

INSERT INTO cms_notification_jobs (
  id, inquiry_id, channel, audience, event_type, locale, recipient, subject,
  rendered_body, status, attempt_count, provider_message_id, last_error,
  dedupe_key, created_at, updated_at
)
SELECT
  'legacy-email-' || id,
  inquiry_id,
  'email',
  'internal',
  'new_inquiry',
  'ko',
  recipient,
  subject,
  '',
  CASE
    WHEN status = 'sent' THEN 'sent'
    ELSE 'needs_attention'
  END,
  1,
  provider_message_id,
  CASE
    WHEN status = 'skipped' AND error_message = '' THEN 'Legacy email event was skipped.'
    ELSE error_message
  END,
  'legacy-email:' || id,
  created_at,
  created_at
FROM cms_email_events
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO cms_notification_attempts (
  id, job_id, attempt_number, status, provider_message_id, error_message, created_at
)
SELECT
  'legacy-email-attempt-' || id,
  'legacy-email-' || id,
  1,
  CASE WHEN status = 'sent' THEN 'sent' ELSE 'failed' END,
  provider_message_id,
  CASE
    WHEN status = 'skipped' AND error_message = '' THEN 'Legacy email event was skipped.'
    ELSE error_message
  END,
  created_at
FROM cms_email_events
ON CONFLICT (id) DO NOTHING;
