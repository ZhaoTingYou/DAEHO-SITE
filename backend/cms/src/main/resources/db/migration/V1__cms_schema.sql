CREATE TABLE IF NOT EXISTS cms_pages (
  page_key text PRIMARY KEY,
  section text NOT NULL DEFAULT 'site',
  sort_order integer NOT NULL DEFAULT 0,
  content_ko jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_en jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_ko jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_en jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_news (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  image_path text NOT NULL DEFAULT '',
  published_at text NOT NULL DEFAULT '',
  is_featured boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_news_translations (
  news_id text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('ko', 'en')),
  title text NOT NULL,
  category_label text NOT NULL DEFAULT '',
  excerpt text NOT NULL DEFAULT '',
  body_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  og_image_path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (news_id, locale),
  CONSTRAINT fk_cms_news_translations_news
    FOREIGN KEY (news_id) REFERENCES cms_news(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_collections (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  sport_category text NOT NULL DEFAULT '',
  image_path text NOT NULL DEFAULT '',
  gallery_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  specs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_collection_translations (
  collection_id text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('ko', 'en')),
  title text NOT NULL,
  caption text NOT NULL DEFAULT '',
  story text NOT NULL DEFAULT '',
  category_label text NOT NULL DEFAULT '',
  sport_category_label text NOT NULL DEFAULT '',
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  og_image_path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, locale),
  CONSTRAINT fk_cms_collection_translations_collection
    FOREIGN KEY (collection_id) REFERENCES cms_collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_media (
  id text PRIMARY KEY,
  filename text NOT NULL,
  path text NOT NULL UNIQUE,
  url text NOT NULL,
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  alt_ko text NOT NULL DEFAULT '',
  alt_en text NOT NULL DEFAULT '',
  storage_provider text NOT NULL DEFAULT 'local',
  storage_key text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_inquiries (
  id text PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('contact', 'golf')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'done', 'spam')),
  locale text NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en')),
  name text NOT NULL,
  contact text NOT NULL,
  organization text NOT NULL DEFAULT '',
  inquiry_type text NOT NULL DEFAULT '',
  team text NOT NULL DEFAULT '',
  quantity integer,
  due_date text NOT NULL DEFAULT '',
  use_case text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  configuration_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_path text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  ip_address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_email_events (
  id text PRIMARY KEY,
  inquiry_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'inquiry_notification',
  recipient text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
  provider_message_id text NOT NULL DEFAULT '',
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_cms_email_events_inquiry
    FOREIGN KEY (inquiry_id) REFERENCES cms_inquiries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cms_news_visible_sort
  ON cms_news (is_visible, sort_order, published_at);

CREATE INDEX IF NOT EXISTS idx_cms_collections_visible_sort
  ON cms_collections (is_visible, sort_order);

CREATE INDEX IF NOT EXISTS idx_cms_inquiries_status_created
  ON cms_inquiries (status, created_at);

CREATE INDEX IF NOT EXISTS idx_cms_media_filename
  ON cms_media (filename);
