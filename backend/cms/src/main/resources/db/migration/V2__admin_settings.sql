CREATE TABLE IF NOT EXISTS cms_admin_settings (
  setting_key text PRIMARY KEY,
  setting_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
