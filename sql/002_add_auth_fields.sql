-- Add email and password_hash to profiles for self-hosted auth (NextAuth Credentials)

BEGIN;

ALTER TABLE profiles ADD COLUMN email text NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN password_hash text NOT NULL DEFAULT '';

-- Remove defaults after column creation
ALTER TABLE profiles ALTER COLUMN email DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN password_hash DROP DEFAULT;

-- Email must be unique
CREATE UNIQUE INDEX idx_profiles_email ON profiles(lower(email));

-- Allow profiles.id to be auto-generated (no longer tied to Supabase auth.users)
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
