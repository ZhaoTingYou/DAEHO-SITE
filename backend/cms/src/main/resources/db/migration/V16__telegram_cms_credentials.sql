ALTER TABLE cms_notification_settings
  ADD COLUMN IF NOT EXISTS telegram_bot_token_ciphertext text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram_chat_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram_test_fingerprint text NOT NULL DEFAULT '';
