CREATE TABLE IF NOT EXISTS cms_account_feature_settings (
  id text PRIMARY KEY CHECK (id = 'global'),
  customer_accounts_enabled boolean NOT NULL DEFAULT false,
  inquiry_account_required boolean NOT NULL DEFAULT false,
  updated_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_account_feature_dependency
    CHECK (customer_accounts_enabled OR NOT inquiry_account_required)
);

INSERT INTO cms_account_feature_settings (
  id, customer_accounts_enabled, inquiry_account_required, updated_by
) VALUES ('global', false, false, 'migration')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS cms_account_feature_events (
  id uuid PRIMARY KEY,
  customer_accounts_enabled boolean NOT NULL,
  inquiry_account_required boolean NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_account_feature_events_created
  ON cms_account_feature_events (created_at DESC);
