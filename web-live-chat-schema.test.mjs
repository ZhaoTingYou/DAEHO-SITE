import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const v19 = readFileSync(
  new URL('./backend/cms/src/main/resources/db/migration/V19__embedded_web_live_chat.sql', import.meta.url),
  'utf8'
);
const v20 = readFileSync(
  new URL('./backend/cms/src/main/resources/db/migration/V20__customer_message_history.sql', import.meta.url),
  'utf8'
);

test('V19 defines isolated anonymous visitors, conversations, messages, and rate limits', () => {
  assert.match(v19, /CREATE TABLE IF NOT EXISTS cms_web_live_chat_visitors/);
  assert.match(v19, /token_hash text NOT NULL UNIQUE/);
  assert.match(v19, /CREATE TABLE IF NOT EXISTS cms_web_live_chat_conversations/);
  assert.match(v19, /CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_open_conversation/);
  assert.match(v19, /CREATE TABLE IF NOT EXISTS cms_web_live_chat_messages/);
  assert.match(v19, /client_message_key text/);
  assert.match(v19, /CREATE TABLE IF NOT EXISTS cms_web_live_chat_rate_limits/);
  assert.match(v19, /'web_live_chat'/);
});

test('V20 backfills exactly one durable initial visitor message per conversation', () => {
  assert.match(v20, /ADD COLUMN IF NOT EXISTS is_initial boolean NOT NULL DEFAULT false/);
  assert.match(v20, /CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_initial_message/);
  assert.match(v20, /WHERE is_initial/);
  assert.match(v20, /SELECT c\.id, 'visitor', c\.inquiry_content, 'delivered'/);
  assert.match(v20, /ON CONFLICT \(conversation_id\) WHERE is_initial DO NOTHING/);
});
