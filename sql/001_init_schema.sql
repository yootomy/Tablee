-- ============================================================
-- Tablee MVP - Schema initial PostgreSQL
-- Source: SCHEMA_BDD_MVP-app-familiale-recettes.md V1
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE family_role AS ENUM ('admin', 'member');
CREATE TYPE meal_slot AS ENUM ('lunch', 'dinner');
CREATE TYPE meal_plan_status AS ENUM ('planned', 'done', 'canceled');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2.1 profiles
CREATE TABLE profiles (
    id uuid PRIMARY KEY,
    display_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.2 families
CREATE TABLE families (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_by_profile_id uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.3 profile_preferences
CREATE TABLE profile_preferences (
    profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    active_family_id uuid NULL REFERENCES families(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.4 family_members
CREATE TABLE family_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role family_role NOT NULL DEFAULT 'member',
    invited_by_profile_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
    joined_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (family_id, profile_id)
);

-- 2.5 family_invites
CREATE TABLE family_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    created_by_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    role_to_grant family_role NOT NULL DEFAULT 'member',
    code_hash text NOT NULL UNIQUE,
    code_last4 text NOT NULL,
    max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
    uses_count integer NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
    expires_at timestamptz NULL,
    revoked_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.6 family_context_preferences
CREATE TABLE family_context_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    last_selected_location_id uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (profile_id, family_id)
);

-- 2.7 locations
CREATE TABLE locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name text NOT NULL,
    archived_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (family_id, id)
);

-- FK: family_context_preferences.last_selected_location_id -> locations
ALTER TABLE family_context_preferences
    ADD CONSTRAINT fk_fcp_location
    FOREIGN KEY (last_selected_location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- 2.8 recipes
CREATE TABLE recipes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    created_by_profile_id uuid NOT NULL,
    updated_by_profile_id uuid NULL,
    title text NOT NULL,
    description text NULL,
    prep_time_minutes integer NULL CHECK (prep_time_minutes >= 0),
    cook_time_minutes integer NULL CHECK (cook_time_minutes >= 0),
    servings integer NULL CHECK (servings > 0),
    source_url text NULL,
    archived_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (family_id, id),
    FOREIGN KEY (family_id, created_by_profile_id) REFERENCES family_members(family_id, profile_id),
    FOREIGN KEY (family_id, updated_by_profile_id) REFERENCES family_members(family_id, profile_id)
);

-- 2.9 recipe_ingredients
CREATE TABLE recipe_ingredients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position integer NOT NULL,
    name text NOT NULL,
    quantity_numeric numeric(10,2) NULL CHECK (quantity_numeric >= 0),
    unit text NULL,
    raw_quantity_text text NULL,
    note text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (recipe_id, position)
);

-- 2.10 recipe_steps
CREATE TABLE recipe_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position integer NOT NULL,
    instruction text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (recipe_id, position)
);

-- 2.11 meal_plans
CREATE TABLE meal_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    recipe_id uuid NULL,
    location_id uuid NOT NULL,
    responsible_profile_id uuid NULL,
    meal_date date NOT NULL,
    meal_slot meal_slot NOT NULL,
    status meal_plan_status NOT NULL DEFAULT 'planned',
    title text NOT NULL,
    notes text NULL,
    created_by_profile_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (family_id, id),
    FOREIGN KEY (family_id, location_id) REFERENCES locations(family_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (family_id, responsible_profile_id) REFERENCES family_members(family_id, profile_id) ON DELETE SET NULL,
    FOREIGN KEY (family_id, created_by_profile_id) REFERENCES family_members(family_id, profile_id) ON DELETE RESTRICT,
    FOREIGN KEY (family_id, recipe_id) REFERENCES recipes(family_id, id) ON DELETE SET NULL
);

-- 2.12 shopping_items
CREATE TABLE shopping_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    location_id uuid NOT NULL,
    name text NOT NULL,
    quantity_numeric numeric(10,2) NULL CHECK (quantity_numeric >= 0),
    unit text NULL,
    raw_quantity_text text NULL,
    comment text NULL,
    is_completed boolean NOT NULL DEFAULT false,
    created_by_profile_id uuid NOT NULL,
    completed_by_profile_id uuid NULL,
    completed_at timestamptz NULL,
    source_recipe_id uuid NULL,
    source_meal_plan_id uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (family_id, location_id) REFERENCES locations(family_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (family_id, created_by_profile_id) REFERENCES family_members(family_id, profile_id) ON DELETE RESTRICT,
    FOREIGN KEY (family_id, completed_by_profile_id) REFERENCES family_members(family_id, profile_id) ON DELETE SET NULL,
    FOREIGN KEY (family_id, source_recipe_id) REFERENCES recipes(family_id, id) ON DELETE SET NULL,
    FOREIGN KEY (family_id, source_meal_plan_id) REFERENCES meal_plans(family_id, id) ON DELETE SET NULL
);

-- 2.13 activity_logs (optionnel, phase 2)
CREATE TABLE activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    actor_profile_id uuid NULL,
    entity_type text NOT NULL,
    entity_id uuid NULL,
    action text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. INDEX
-- ============================================================

CREATE INDEX idx_family_members_profile_id ON family_members(profile_id);
CREATE INDEX idx_family_invites_code_hash ON family_invites(code_hash);
CREATE INDEX idx_locations_family_archived ON locations(family_id, archived_at);
CREATE INDEX idx_recipes_family_archived_created ON recipes(family_id, archived_at, created_at DESC);
CREATE INDEX idx_recipes_family_title ON recipes(family_id, title);
CREATE INDEX idx_recipe_ingredients_recipe_pos ON recipe_ingredients(recipe_id, position);
CREATE INDEX idx_recipe_steps_recipe_pos ON recipe_steps(recipe_id, position);
CREATE INDEX idx_meal_plans_family_date_slot ON meal_plans(family_id, meal_date, meal_slot);
CREATE INDEX idx_meal_plans_family_location_date ON meal_plans(family_id, location_id, meal_date);
CREATE INDEX idx_shopping_items_family_loc_completed ON shopping_items(family_id, location_id, is_completed, created_at DESC);
CREATE INDEX idx_shopping_items_family_source_recipe ON shopping_items(family_id, source_recipe_id);

-- Index unique partiel : pas de doublon de nom de lieu actif par famille
CREATE UNIQUE INDEX idx_locations_unique_name_per_family
    ON locations(family_id, lower(name))
    WHERE archived_at IS NULL;

-- ============================================================
-- 4. TRIGGERS updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_families_updated_at BEFORE UPDATE ON families FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profile_preferences_updated_at BEFORE UPDATE ON profile_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_family_context_preferences_updated_at BEFORE UPDATE ON family_context_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shopping_items_updated_at BEFORE UPDATE ON shopping_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. GRANT permissions to tablee_app
-- ============================================================

GRANT USAGE ON SCHEMA public TO tablee_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tablee_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tablee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tablee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tablee_app;

COMMIT;
