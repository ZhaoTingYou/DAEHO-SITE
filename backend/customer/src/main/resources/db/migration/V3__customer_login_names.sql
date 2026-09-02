ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS login_name text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_profiles_login_name
  ON customer_profiles (lower(login_name))
  WHERE login_name <> '' AND status <> 'deleted';
