CREATE TABLE cms_analytics_sessions (
  session_id uuid PRIMARY KEY,
  channel text NOT NULL,
  source text NOT NULL,
  medium text NOT NULL,
  campaign text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  referrer_host text NOT NULL DEFAULT '',
  landing_path text NOT NULL,
  latest_path text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('ko', 'en')),
  device_class text NOT NULL CHECK (device_class IN ('desktop', 'tablet', 'mobile')),
  page_view_count integer NOT NULL DEFAULT 0 CHECK (page_view_count >= 0),
  started_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL
);

CREATE TABLE cms_analytics_pageviews (
  page_view_id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES cms_analytics_sessions(session_id) ON DELETE CASCADE,
  page_path text NOT NULL,
  page_title text NOT NULL DEFAULT '',
  viewed_at timestamptz NOT NULL
);

CREATE INDEX idx_cms_analytics_sessions_started_at
  ON cms_analytics_sessions (started_at);

CREATE INDEX idx_cms_analytics_sessions_last_activity_at
  ON cms_analytics_sessions (last_activity_at);

CREATE INDEX idx_cms_analytics_sessions_channel_started_at
  ON cms_analytics_sessions (channel, started_at);

CREATE INDEX idx_cms_analytics_sessions_landing_path
  ON cms_analytics_sessions (landing_path);

CREATE INDEX idx_cms_analytics_pageviews_session_id_viewed_at
  ON cms_analytics_pageviews (session_id, viewed_at);

CREATE INDEX idx_cms_analytics_pageviews_viewed_at
  ON cms_analytics_pageviews (viewed_at);
