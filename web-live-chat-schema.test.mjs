import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';

const v19 = readFileSync(
  new URL('./backend/cms/src/main/resources/db/migration/V19__embedded_web_live_chat.sql', import.meta.url),
  'utf8'
);
const v20 = readFileSync(
  new URL('./backend/cms/src/main/resources/db/migration/V20__customer_message_history.sql', import.meta.url),
  'utf8'
);
const canonicalSchema = readFileSync(
  new URL('./database/cms-schema.sql', import.meta.url),
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

test('canonical SQLite schema mirrors the V20 initial-message constraint', () => {
  assert.match(canonicalSchema, /is_initial INTEGER NOT NULL DEFAULT 0/);
  assert.match(canonicalSchema, /CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_initial_message/);
  assert.match(canonicalSchema, /WHERE is_initial = 1/);

  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    db.exec(canonicalSchema);

    const column = db.prepare(`
      SELECT name, type, "notnull" AS is_not_null, dflt_value
      FROM pragma_table_info('cms_web_live_chat_messages')
      WHERE name = 'is_initial'
    `).get();
    assert.deepEqual(column, {
      name: 'is_initial', type: 'INTEGER', is_not_null: 1, dflt_value: '0'
    });

    const index = db.prepare(`
      SELECT name, "unique" AS is_unique, partial
      FROM pragma_index_list('cms_web_live_chat_messages')
      WHERE name = 'uq_cms_web_live_chat_initial_message'
    `).get();
    assert.deepEqual(index, {
      name: 'uq_cms_web_live_chat_initial_message',
      is_unique: 1,
      partial: 1
    });
  } finally {
    db.close();
  }
});
