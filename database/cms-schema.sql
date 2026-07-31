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

CREATE TABLE IF NOT EXISTS cms_inquiries (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('contact', 'golf')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'done', 'spam')),
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
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  FOREIGN KEY (inquiry_id) REFERENCES cms_inquiries(id) ON DELETE CASCADE
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
  status TEXT NOT NULL DEFAULT 'queued',
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
