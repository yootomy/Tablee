-- Runtime compatibility and hardening tables for auth, rate limiting and AI import

BEGIN;

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url text NULL;

ALTER TABLE profiles ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS oauth_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_accounts_provider_account
    ON oauth_accounts(provider, provider_account_id);

CREATE TABLE IF NOT EXISTS request_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope text NOT NULL,
    identifier text NOT NULL,
    window_start timestamptz NOT NULL,
    hit_count integer NOT NULL DEFAULT 1,
    last_hit_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (scope, identifier, window_start)
);

CREATE INDEX IF NOT EXISTS idx_request_rate_limits_scope_identifier_last_hit
    ON request_rate_limits(scope, identifier, last_hit_at DESC);

CREATE TABLE IF NOT EXISTS recipe_import_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    requested_by_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider text NOT NULL,
    source_url text NOT NULL,
    source_url_hash text NOT NULL,
    status text NOT NULL,
    recipe_id uuid NULL REFERENCES recipes(id) ON DELETE SET NULL,
    error_message text NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at timestamptz NULL,
    finished_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_import_jobs_family_status_created
    ON recipe_import_jobs(family_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recipe_import_jobs_profile_created
    ON recipe_import_jobs(requested_by_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recipe_import_jobs_source_hash
    ON recipe_import_jobs(family_id, source_url_hash, created_at DESC);

COMMIT;
