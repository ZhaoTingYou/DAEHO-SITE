ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS inquiries_unlinked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_profiles_active_phone
  ON customer_profiles (phone) WHERE phone <> '' AND status <> 'deleted';

ALTER TABLE legacy_inquiry_claims
  ADD COLUMN IF NOT EXISTS contact_hint text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS match_result text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS link_state text NOT NULL DEFAULT 'not_linked';

ALTER TABLE legacy_inquiry_claims
  DROP CONSTRAINT IF EXISTS ck_legacy_claims_link_state;

ALTER TABLE legacy_inquiry_claims
  ADD CONSTRAINT ck_legacy_claims_link_state
  CHECK (link_state IN ('not_linked', 'pending', 'linked'));

CREATE INDEX IF NOT EXISTS idx_legacy_claims_link_state
  ON legacy_inquiry_claims (link_state, reviewed_at)
  WHERE status = 'approved';
