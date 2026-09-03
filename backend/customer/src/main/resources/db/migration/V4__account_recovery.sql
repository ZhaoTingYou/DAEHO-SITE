CREATE TABLE account_recovery_attempts (
  id uuid PRIMARY KEY,
  purpose text NOT NULL CHECK (purpose IN ('username', 'password')),
  customer_id uuid REFERENCES customer_profiles(customer_id) ON DELETE SET NULL,
  login_name text NOT NULL DEFAULT '',
  phone_fingerprint text NOT NULL,
  ip_fingerprint text NOT NULL,
  idempotency_key_hash text NOT NULL UNIQUE,
  locale text NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en')),
  status text NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'delivery_unknown', 'decoy', 'failed', 'verified', 'resetting', 'consumed')),
  challenge_hash text NOT NULL DEFAULT '',
  attempt_count integer NOT NULL DEFAULT 0,
  provider_message_id text NOT NULL DEFAULT '',
  sent_at timestamptz,
  delivery_lease_expires_at timestamptz,
  expires_at timestamptz NOT NULL,
  grant_hash text NOT NULL DEFAULT '',
  grant_expires_at timestamptz,
  verified_at timestamptz,
  consumed_at timestamptz,
  reset_operation_hash text NOT NULL DEFAULT '',
  reset_stage text NOT NULL DEFAULT '' CHECK (reset_stage IN ('', 'reserved', 'sessions_invalidated')),
  reset_lease_expires_at timestamptz,
  reset_deadline_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_account_recovery_grant
  ON account_recovery_attempts (grant_hash) WHERE grant_hash <> '';

CREATE INDEX idx_account_recovery_phone_rate
  ON account_recovery_attempts (purpose, phone_fingerprint, created_at DESC);

CREATE INDEX idx_account_recovery_ip_rate
  ON account_recovery_attempts (purpose, ip_fingerprint, created_at DESC);

CREATE INDEX idx_account_recovery_expiry
  ON account_recovery_attempts (expires_at);
