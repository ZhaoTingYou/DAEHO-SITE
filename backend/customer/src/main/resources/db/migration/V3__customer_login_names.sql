ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS login_name text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_profiles_login_name
  ON customer_profiles (lower(login_name))
  WHERE login_name <> '' AND status <> 'deleted';

CREATE TABLE IF NOT EXISTS customer_identities (
  cognito_subject text PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO customer_identities (cognito_subject, customer_id)
SELECT cognito_subject, customer_id FROM customer_profiles
ON CONFLICT (cognito_subject) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_customer_identities_customer
  ON customer_identities (customer_id);

ALTER TABLE verification_sessions
  ADD COLUMN IF NOT EXISTS signup_user_pool_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS signup_client_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS signup_username text NOT NULL DEFAULT '';
