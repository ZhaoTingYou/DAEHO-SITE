-- Kakao emphasized templates require a title at dispatch time. Persist the
-- presentation type on both the reusable template and the immutable job
-- snapshot so a later template edit cannot change an already queued message.
ALTER TABLE cms_notification_templates
  ADD COLUMN IF NOT EXISTS kakao_template_type text NOT NULL DEFAULT 'basic';

ALTER TABLE cms_notification_jobs
  ADD COLUMN IF NOT EXISTS kakao_template_type text NOT NULL DEFAULT 'basic';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_cms_notification_templates_kakao_template_type'
  ) THEN
    ALTER TABLE cms_notification_templates
      ADD CONSTRAINT chk_cms_notification_templates_kakao_template_type
      CHECK (kakao_template_type IN ('basic', 'highlight'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_cms_notification_jobs_kakao_template_type'
  ) THEN
    ALTER TABLE cms_notification_jobs
      ADD CONSTRAINT chk_cms_notification_jobs_kakao_template_type
      CHECK (kakao_template_type IN ('basic', 'highlight'));
  END IF;
END $$;

-- Existing templates predate the type field and therefore require an explicit
-- CMS selection plus a new successful test before Kakao can be enabled again.
UPDATE cms_notification_settings
SET kakao_enabled = false,
    updated_at = now();

DELETE FROM cms_kakao_template_verifications;

UPDATE cms_notification_jobs
SET status = 'needs_attention',
    retry_blocked = true,
    last_error = CASE
      WHEN last_error = '' THEN 'Kakao template presentation type was not captured; manual review is required.'
      ELSE last_error || ' | Kakao template presentation type was not captured; manual review is required.'
    END,
    updated_at = now()
WHERE channel = 'kakao'
  AND status IN ('queued', 'processing', 'provider_pending', 'failed');
