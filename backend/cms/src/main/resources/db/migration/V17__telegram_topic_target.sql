ALTER TABLE cms_notification_settings
  ADD COLUMN IF NOT EXISTS telegram_message_thread_id text NOT NULL DEFAULT '';
