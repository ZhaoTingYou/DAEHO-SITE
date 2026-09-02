ALTER TABLE cms_inquiries ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE cms_inquiries ADD COLUMN IF NOT EXISTS link_source text;
ALTER TABLE cms_inquiries ADD COLUMN IF NOT EXISTS linked_at timestamptz;

ALTER TABLE cms_inquiries DROP CONSTRAINT IF EXISTS ck_cms_inquiries_link_source;
ALTER TABLE cms_inquiries ADD CONSTRAINT ck_cms_inquiries_link_source
  CHECK (link_source IS NULL OR link_source IN ('authenticated', 'claim', 'admin'));

CREATE INDEX IF NOT EXISTS idx_cms_inquiries_customer_created
  ON cms_inquiries (customer_id, created_at DESC) WHERE customer_id IS NOT NULL;
