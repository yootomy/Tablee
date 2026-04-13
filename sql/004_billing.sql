-- Billing and subscription support for family premium plans

BEGIN;

CREATE TABLE IF NOT EXISTS family_billing_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
    stripe_customer_id text NOT NULL UNIQUE,
    billing_email text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS family_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
    billing_account_id uuid NOT NULL REFERENCES family_billing_accounts(id) ON DELETE CASCADE,
    provider text NOT NULL,
    stripe_subscription_id text NULL UNIQUE,
    stripe_price_id_current text NULL,
    stripe_price_id_scheduled text NULL,
    status text NOT NULL,
    plan_key text NOT NULL,
    billing_tier text NULL,
    scheduled_billing_tier text NULL,
    trial_end_at timestamptz NULL,
    current_period_end_at timestamptz NULL,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NULL REFERENCES families(id) ON DELETE SET NULL,
    provider text NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    processed_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_webhook_events_provider_event
    ON billing_webhook_events(provider, event_id);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_provider_created
    ON billing_webhook_events(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_family_created
    ON billing_webhook_events(family_id, created_at DESC);

COMMIT;
