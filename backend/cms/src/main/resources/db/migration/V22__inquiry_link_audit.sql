CREATE TABLE IF NOT EXISTS cms_inquiry_link_events (
  id text PRIMARY KEY,
  inquiry_id text NOT NULL REFERENCES cms_inquiries(id) ON DELETE CASCADE,
  customer_id uuid,
  action text NOT NULL CHECK (action IN ('claim', 'admin', 'unlink')),
  actor text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_inquiry_link_events_inquiry_created
  ON cms_inquiry_link_events (inquiry_id, created_at DESC);
