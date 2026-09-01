ALTER TABLE cms_inquiries
  DROP CONSTRAINT IF EXISTS cms_inquiries_source_check;

ALTER TABLE cms_inquiries
  ADD CONSTRAINT cms_inquiries_source_check
  CHECK (source IN ('contact', 'golf', 'telegram'));

CREATE TABLE IF NOT EXISTS cms_telegram_live_chat_settings (
  id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  bot_token_ciphertext text NOT NULL DEFAULT '',
  bot_username text NOT NULL DEFAULT '',
  target_chat_id text NOT NULL DEFAULT '',
  message_thread_id text NOT NULL DEFAULT '',
  topic_name text NOT NULL DEFAULT '실시간 상담',
  webhook_secret_hash text NOT NULL DEFAULT '',
  setup_state text NOT NULL DEFAULT 'idle'
    CHECK (setup_state IN ('idle', 'connecting', 'needs_attention')),
  setup_error_code text NOT NULL DEFAULT '',
  setup_attempt_id text NOT NULL DEFAULT '',
  configuration_generation bigint NOT NULL DEFAULT 1,
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_telegram_live_chat_settings_singleton CHECK (id = 'default')
);

INSERT INTO cms_telegram_live_chat_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS cms_telegram_live_chat_sessions (
  id text PRIMARY KEY,
  configuration_generation bigint NOT NULL,
  target_chat_id text NOT NULL,
  telegram_chat_id bigint NOT NULL,
  telegram_user_id bigint NOT NULL,
  inquiry_id text,
  locale text NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en')),
  state text NOT NULL DEFAULT 'awaiting_consent'
    CHECK (state IN ('awaiting_consent', 'awaiting_name', 'awaiting_contact', 'awaiting_content', 'needs_attention', 'active', 'closed')),
  customer_name text NOT NULL DEFAULT '',
  customer_contact text NOT NULL DEFAULT '',
  inquiry_content text NOT NULL DEFAULT '',
  attention_code text NOT NULL DEFAULT '',
  pending_customer_message_id bigint,
  pending_group_message_id bigint,
  pending_direction text NOT NULL DEFAULT ''
    CHECK (pending_direction IN ('', 'customer_to_team', 'team_to_customer', 'registration')),
  topic_thread_id bigint,
  topic_root_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_cms_telegram_live_chat_sessions_inquiry
    FOREIGN KEY (inquiry_id) REFERENCES cms_inquiries(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_telegram_live_chat_open_session
  ON cms_telegram_live_chat_sessions (configuration_generation, telegram_chat_id)
  WHERE state <> 'closed';

CREATE TABLE IF NOT EXISTS cms_telegram_live_chat_messages (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('registration', 'customer_to_team', 'team_to_customer')),
  customer_message_id bigint,
  group_message_id bigint,
  configuration_generation bigint NOT NULL,
  group_chat_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_cms_telegram_live_chat_messages_session
    FOREIGN KEY (session_id) REFERENCES cms_telegram_live_chat_sessions(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_telegram_live_chat_message_generation
    UNIQUE (configuration_generation, group_chat_id, group_message_id)
);

CREATE TABLE IF NOT EXISTS cms_telegram_live_chat_updates (
  configuration_generation bigint NOT NULL,
  update_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed')),
  claim_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (configuration_generation, update_id)
);

CREATE INDEX IF NOT EXISTS idx_cms_telegram_live_chat_sessions_state_updated
  ON cms_telegram_live_chat_sessions (state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cms_telegram_live_chat_messages_session_created
  ON cms_telegram_live_chat_messages (session_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_telegram_live_chat_customer_source
  ON cms_telegram_live_chat_messages (session_id, customer_message_id)
  WHERE customer_message_id IS NOT NULL AND customer_message_id > 0;
