CREATE TABLE IF NOT EXISTS cms_admin_users (
  id text PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER', 'EDITOR')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  expires_at timestamptz,
  must_change_password boolean NOT NULL DEFAULT false,
  session_version bigint NOT NULL DEFAULT 1,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_admin_users_email_normalized CHECK (email = lower(btrim(email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_admin_users_email_lower
  ON cms_admin_users (lower(email));

CREATE INDEX IF NOT EXISTS idx_cms_admin_users_role_status
  ON cms_admin_users (role, status);
