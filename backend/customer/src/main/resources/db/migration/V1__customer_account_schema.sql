CREATE TABLE customer_profiles (
  customer_id uuid PRIMARY KEY,
  cognito_subject text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'deletion_pending', 'deleted')),
  legal_name text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en')),
  country text NOT NULL DEFAULT '',
  organization text NOT NULL DEFAULT '',
  team text NOT NULL DEFAULT '',
  verification_method text NOT NULL CHECK (verification_method IN ('email_declaration', 'sms_declaration')),
  verified_at timestamptz NOT NULL,
  adult_verified boolean NOT NULL DEFAULT false,
  session_version bigint NOT NULL DEFAULT 1,
  sessions_valid_after timestamptz NOT NULL DEFAULT to_timestamp(0),
  deletion_requested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity_verifications (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('email_declaration', 'sms_declaration')),
  identifier_snapshot text NOT NULL DEFAULT '',
  ci_fingerprint text NOT NULL DEFAULT '',
  adult_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_identity_verifications_ci
  ON identity_verifications (ci_fingerprint) WHERE ci_fingerprint <> '';

CREATE TABLE consent_receipts (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT false,
  consented_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification_sessions (
  id uuid PRIMARY KEY,
  method text NOT NULL CHECK (method IN ('email_declaration', 'sms_declaration')),
  identifier text NOT NULL,
  legal_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  ci_fingerprint text NOT NULL DEFAULT '',
  adult_verified boolean NOT NULL DEFAULT false,
  locale text NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en')),
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  challenge_hash text NOT NULL DEFAULT '',
  attempt_count integer NOT NULL DEFAULT 0,
  ip_fingerprint text NOT NULL DEFAULT '',
  idempotency_key_hash text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT '',
  provider_message_id text NOT NULL DEFAULT '',
  sent_at timestamptz,
  grant_hash text NOT NULL DEFAULT '',
  grant_expires_at timestamptz,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_verification_sessions_grant
  ON verification_sessions (grant_hash) WHERE grant_hash <> '';
CREATE INDEX idx_verification_sessions_expiry ON verification_sessions (expires_at);
CREATE UNIQUE INDEX uq_verification_sessions_idempotency
  ON verification_sessions (idempotency_key_hash) WHERE idempotency_key_hash <> '';

CREATE TABLE legacy_inquiry_claims (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
  inquiry_id text NOT NULL,
  contact_fingerprint text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer text NOT NULL DEFAULT '',
  review_reason text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, inquiry_id)
);

CREATE TABLE account_audit_events (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customer_profiles(customer_id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor text NOT NULL DEFAULT '',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_profiles_status_created ON customer_profiles (status, created_at DESC);
CREATE INDEX idx_legacy_claims_status_created ON legacy_inquiry_claims (status, created_at DESC);
CREATE INDEX idx_account_audit_customer_created ON account_audit_events (customer_id, created_at DESC);
