ALTER TABLE cms_web_live_chat_messages
  ADD COLUMN IF NOT EXISTS is_initial boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_initial_message
  ON cms_web_live_chat_messages(conversation_id)
  WHERE is_initial;

INSERT INTO cms_web_live_chat_messages (
  conversation_id,
  direction,
  body,
  delivery_state,
  client_message_key,
  created_at,
  delivered_at,
  is_initial
)
SELECT c.id, 'visitor', c.inquiry_content, 'delivered',
       'web-live-chat-initial-backfill:' || c.id,
       c.created_at, c.created_at, true
FROM cms_web_live_chat_conversations c
ON CONFLICT (conversation_id) WHERE is_initial DO NOTHING;
