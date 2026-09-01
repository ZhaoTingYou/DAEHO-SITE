ALTER TABLE cms_inquiries DROP CONSTRAINT IF EXISTS cms_inquiries_source_check;
ALTER TABLE cms_inquiries ADD CONSTRAINT cms_inquiries_source_check
  CHECK (source IN ('contact', 'golf', 'telegram', 'web_live_chat'));

CREATE TABLE IF NOT EXISTS cms_web_live_chat_visitors (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_web_live_chat_conversations (
  id text PRIMARY KEY,
  visitor_id text NOT NULL REFERENCES cms_web_live_chat_visitors(id),
  configuration_generation bigint NOT NULL,
  target_chat_id text NOT NULL,
  inquiry_id text REFERENCES cms_inquiries(id) ON DELETE SET NULL,
  locale text NOT NULL CHECK (locale IN ('ko', 'en')),
  state text NOT NULL CHECK (state IN ('opening', 'active', 'needs_attention', 'closed')),
  customer_name text NOT NULL,
  customer_contact text NOT NULL,
  inquiry_content text NOT NULL,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  attention_code text NOT NULL DEFAULT '',
  pending_action text NOT NULL DEFAULT ''
    CHECK (pending_action IN ('', 'topic_creation', 'registration_delivery', 'visitor_delivery', 'topic_close')),
  pending_message_id bigint,
  pending_client_message_key text NOT NULL DEFAULT '',
  topic_thread_id bigint,
  topic_root_message_id bigint,
  last_read_team_message_id bigint,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_open_conversation
  ON cms_web_live_chat_conversations(visitor_id, configuration_generation)
  WHERE state <> 'closed';

CREATE TABLE IF NOT EXISTS cms_web_live_chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES cms_web_live_chat_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('visitor', 'team', 'system')),
  body text NOT NULL,
  delivery_state text NOT NULL CHECK (delivery_state IN ('pending', 'delivered', 'needs_attention')),
  client_message_key text,
  telegram_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  UNIQUE (conversation_id, client_message_key),
  UNIQUE (conversation_id, telegram_message_id)
);

CREATE TABLE IF NOT EXISTS cms_web_live_chat_rate_limits (
  key_hash text NOT NULL,
  action text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (key_hash, action)
);

CREATE INDEX IF NOT EXISTS idx_cms_web_live_chat_visitors_expires
  ON cms_web_live_chat_visitors(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_topic
  ON cms_web_live_chat_conversations(configuration_generation, target_chat_id, topic_thread_id)
  WHERE topic_thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cms_web_live_chat_messages_replay
  ON cms_web_live_chat_messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS idx_cms_web_live_chat_rate_limits_expires
  ON cms_web_live_chat_rate_limits(expires_at);
