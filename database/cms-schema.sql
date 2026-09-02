PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cms_pages (
  page_key TEXT PRIMARY KEY,
  section TEXT NOT NULL DEFAULT 'site',
  sort_order INTEGER NOT NULL DEFAULT 0,
  content_ko TEXT NOT NULL DEFAULT '{}',
  content_en TEXT NOT NULL DEFAULT '{}',
  seo_ko TEXT NOT NULL DEFAULT '{}',
  seo_en TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_news (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  image_path TEXT NOT NULL DEFAULT '',
  mobile_image_path TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_news_translations (
  news_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('ko', 'en')),
  title TEXT NOT NULL,
  category_label TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL DEFAULT '{}',
  tags_json TEXT NOT NULL DEFAULT '[]',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  og_image_path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (news_id, locale),
  FOREIGN KEY (news_id) REFERENCES cms_news(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  sport_category TEXT NOT NULL DEFAULT '',
  image_path TEXT NOT NULL DEFAULT '',
  gallery_json TEXT NOT NULL DEFAULT '[]',
  specs_json TEXT NOT NULL DEFAULT '{}',
  is_visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_collection_translations (
  collection_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('ko', 'en')),
  title TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  category_label TEXT NOT NULL DEFAULT '',
  sport_category_label TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  og_image_path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (collection_id, locale),
  FOREIGN KEY (collection_id) REFERENCES cms_collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  alt_ko TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  storage_provider TEXT NOT NULL DEFAULT 'public',
  storage_key TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_inquiry_statuses (
  code TEXT PRIMARY KEY,
  label_ko TEXT NOT NULL,
  label_en TEXT NOT NULL DEFAULT '',
  label_zh TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'slate',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO cms_inquiry_statuses (
  code, label_ko, label_en, label_zh, color, sort_order, is_active, is_system
) VALUES
  ('new', '신규', 'New', '新提交', 'slate', 0, 1, 1),
  ('contacted', '연락 완료', 'Contacted', '已联系', 'blue', 10, 1, 1),
  ('in_progress', '진행 중', 'In progress', '处理中', 'amber', 20, 1, 1),
  ('done', '처리 완료', 'Completed', '已完成', 'green', 30, 1, 1),
  ('spam', '스팸', 'Spam', '垃圾信息', 'red', 40, 1, 1);

CREATE TABLE IF NOT EXISTS cms_inquiries (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('contact', 'golf', 'telegram', 'web_live_chat')),
  status TEXT NOT NULL DEFAULT 'new',
  locale TEXT NOT NULL DEFAULT 'ko',
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  inquiry_type TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  quantity INTEGER,
  due_date TEXT NOT NULL DEFAULT '',
  use_case TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  configuration_json TEXT NOT NULL DEFAULT '{}',
  page_path TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (status) REFERENCES cms_inquiry_statuses(code) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_email_events (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'inquiry_notification',
  recipient TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
  provider_message_id TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (inquiry_id) REFERENCES cms_inquiries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_inquiry_status_events (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  next_status TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (inquiry_id) REFERENCES cms_inquiries(id) ON DELETE CASCADE,
  FOREIGN KEY (previous_status) REFERENCES cms_inquiry_statuses(code) ON UPDATE CASCADE,
  FOREIGN KEY (next_status) REFERENCES cms_inquiry_statuses(code) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_notification_settings (
  id TEXT PRIMARY KEY,
  internal_email TEXT NOT NULL DEFAULT '',
  internal_email_enabled INTEGER NOT NULL DEFAULT 0,
  customer_email_enabled INTEGER NOT NULL DEFAULT 0,
  kakao_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_notification_templates (
  id TEXT PRIMARY KEY,
  template_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  audience TEXT NOT NULL,
  event_type TEXT NOT NULL,
  inquiry_status TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'ko',
  version INTEGER NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  provider_template_code TEXT NOT NULL DEFAULT '',
  kakao_template_type TEXT NOT NULL DEFAULT 'basic',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (template_key, version)
);

CREATE TABLE IF NOT EXISTS cms_notification_jobs (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL,
  status_event_id TEXT,
  channel TEXT NOT NULL,
  audience TEXT NOT NULL,
  event_type TEXT NOT NULL,
  inquiry_status TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'ko',
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  rendered_body TEXT NOT NULL,
  template_id TEXT,
  provider_template_code TEXT NOT NULL DEFAULT '',
  kakao_template_type TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'queued',
  retry_blocked INTEGER NOT NULL DEFAULT 0,
  verification_fingerprint TEXT NOT NULL DEFAULT '',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  delivery_check_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  provider_message_id TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (inquiry_id) REFERENCES cms_inquiries(id) ON DELETE CASCADE,
  FOREIGN KEY (status_event_id) REFERENCES cms_inquiry_status_events(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES cms_notification_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cms_notification_attempts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES cms_notification_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cms_news_visible_sort ON cms_news (is_visible, sort_order, published_at);
CREATE INDEX IF NOT EXISTS idx_cms_collections_visible_sort ON cms_collections (is_visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_cms_inquiries_status_created ON cms_inquiries (status, created_at);
CREATE INDEX IF NOT EXISTS idx_cms_media_filename ON cms_media (filename);
CREATE INDEX IF NOT EXISTS idx_cms_inquiry_statuses_active_sort ON cms_inquiry_statuses (is_active, sort_order, code);

CREATE TABLE IF NOT EXISTS cms_telegram_live_chat_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  enabled INTEGER NOT NULL DEFAULT 0,
  bot_token_ciphertext TEXT NOT NULL DEFAULT '',
  bot_username TEXT NOT NULL DEFAULT '',
  target_chat_id TEXT NOT NULL DEFAULT '',
  message_thread_id TEXT NOT NULL DEFAULT '',
  topic_name TEXT NOT NULL DEFAULT '실시간 상담',
  webhook_secret_hash TEXT NOT NULL DEFAULT '',
  setup_state TEXT NOT NULL DEFAULT 'idle'
    CHECK (setup_state IN ('idle', 'connecting', 'needs_attention')),
  setup_error_code TEXT NOT NULL DEFAULT '',
  setup_attempt_id TEXT NOT NULL DEFAULT '',
  configuration_generation INTEGER NOT NULL DEFAULT 1,
  verified_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO cms_telegram_live_chat_settings (id) VALUES ('default');

CREATE TABLE IF NOT EXISTS cms_telegram_live_chat_sessions (
  id TEXT PRIMARY KEY,
  configuration_generation INTEGER NOT NULL,
  target_chat_id TEXT NOT NULL,
  telegram_chat_id INTEGER NOT NULL,
  telegram_user_id INTEGER NOT NULL,
  inquiry_id TEXT,
  locale TEXT NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en')),
  state TEXT NOT NULL DEFAULT 'awaiting_consent'
    CHECK (state IN ('awaiting_consent', 'awaiting_name', 'awaiting_contact', 'awaiting_content', 'needs_attention', 'active', 'closed')),
  customer_name TEXT NOT NULL DEFAULT '',
  customer_contact TEXT NOT NULL DEFAULT '',
  inquiry_content TEXT NOT NULL DEFAULT '',
  attention_code TEXT NOT NULL DEFAULT '',
  pending_customer_message_id INTEGER,
  pending_group_message_id INTEGER,
  pending_direction TEXT NOT NULL DEFAULT ''
    CHECK (pending_direction IN ('', 'customer_to_team', 'team_to_customer', 'registration')),
  topic_thread_id INTEGER,
  topic_root_message_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (inquiry_id) REFERENCES cms_inquiries(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_telegram_live_chat_open_session
  ON cms_telegram_live_chat_sessions (configuration_generation, telegram_chat_id)
  WHERE state <> 'closed';

CREATE TABLE IF NOT EXISTS cms_telegram_live_chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('registration', 'customer_to_team', 'team_to_customer')),
  customer_message_id INTEGER,
  group_message_id INTEGER,
  configuration_generation INTEGER NOT NULL,
  group_chat_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES cms_telegram_live_chat_sessions(id) ON DELETE CASCADE,
  UNIQUE (configuration_generation, group_chat_id, group_message_id)
);

CREATE TABLE IF NOT EXISTS cms_telegram_live_chat_updates (
  configuration_generation INTEGER NOT NULL,
  update_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed')),
  claim_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (configuration_generation, update_id)
);

CREATE INDEX IF NOT EXISTS idx_cms_telegram_live_chat_sessions_state_updated
  ON cms_telegram_live_chat_sessions (state, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_telegram_live_chat_messages_session_created
  ON cms_telegram_live_chat_messages (session_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_telegram_live_chat_customer_source
  ON cms_telegram_live_chat_messages (session_id, customer_message_id)
  WHERE customer_message_id IS NOT NULL AND customer_message_id > 0;

CREATE TABLE IF NOT EXISTS cms_web_live_chat_visitors (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_web_live_chat_conversations (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES cms_web_live_chat_visitors(id),
  configuration_generation INTEGER NOT NULL,
  target_chat_id TEXT NOT NULL,
  inquiry_id TEXT REFERENCES cms_inquiries(id) ON DELETE SET NULL,
  locale TEXT NOT NULL CHECK (locale IN ('ko', 'en')),
  state TEXT NOT NULL CHECK (state IN ('opening', 'active', 'needs_attention', 'closed')),
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  inquiry_content TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  attention_code TEXT NOT NULL DEFAULT '',
  pending_action TEXT NOT NULL DEFAULT ''
    CHECK (pending_action IN ('', 'topic_creation', 'registration_delivery', 'visitor_delivery', 'topic_close')),
  pending_message_id INTEGER,
  pending_client_message_key TEXT NOT NULL DEFAULT '',
  topic_thread_id INTEGER,
  topic_root_message_id INTEGER,
  last_read_team_message_id INTEGER,
  last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_open_conversation
  ON cms_web_live_chat_conversations(visitor_id, configuration_generation)
  WHERE state <> 'closed';

CREATE TABLE IF NOT EXISTS cms_web_live_chat_messages (
  id INTEGER PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES cms_web_live_chat_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('visitor', 'team', 'system')),
  body TEXT NOT NULL,
  delivery_state TEXT NOT NULL CHECK (delivery_state IN ('pending', 'delivered', 'needs_attention')),
  client_message_key TEXT,
  telegram_message_id INTEGER,
  is_initial INTEGER NOT NULL DEFAULT 0 CHECK (is_initial IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT,
  UNIQUE (conversation_id, client_message_key),
  UNIQUE (conversation_id, telegram_message_id)
);

CREATE TABLE IF NOT EXISTS cms_web_live_chat_rate_limits (
  key_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  window_started_at TEXT NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  expires_at TEXT NOT NULL,
  PRIMARY KEY (key_hash, action)
);

CREATE INDEX IF NOT EXISTS idx_cms_web_live_chat_visitors_expires
  ON cms_web_live_chat_visitors(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_topic
  ON cms_web_live_chat_conversations(configuration_generation, target_chat_id, topic_thread_id)
  WHERE topic_thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cms_web_live_chat_messages_replay
  ON cms_web_live_chat_messages(conversation_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_initial_message
  ON cms_web_live_chat_messages(conversation_id)
  WHERE is_initial = 1;
CREATE INDEX IF NOT EXISTS idx_cms_web_live_chat_rate_limits_expires
  ON cms_web_live_chat_rate_limits(expires_at);
