ALTER TABLE cms_notification_jobs
  ADD COLUMN IF NOT EXISTS provider_variables jsonb NOT NULL DEFAULT '{}'::jsonb;
