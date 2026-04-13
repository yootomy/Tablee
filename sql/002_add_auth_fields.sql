-- Add email and password_hash to profiles for self-hosted auth (NextAuth Credentials)

BEGIN;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash text NULL;

-- Remove defaults after column creation
ALTER TABLE profiles ALTER COLUMN email DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN password_hash DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url text NULL;

-- Email must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(lower(email));

-- Allow profiles.id to be auto-generated (no longer tied to Supabase auth.users)
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS oauth_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_accounts_provider_account
    ON oauth_accounts(provider, provider_account_id);

COMMIT;
