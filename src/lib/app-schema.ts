import { prisma } from "@/lib/prisma";

const globalForSchema = globalThis as typeof globalThis & {
  tableeEnsureOperationalSchema?: Promise<void>;
};

function isIgnorableSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Code: `42501`") ||
    /must be owner of table/i.test(message) ||
    /permission denied/i.test(message)
  );
}

async function executeOptionalSchemaQuery(query: string) {
  try {
    await prisma.$executeRawUnsafe(query);
  } catch (error) {
    if (isIgnorableSchemaError(error)) {
      console.warn(
        "[schema] Skipping optional runtime compatibility query due to insufficient privileges.",
      );
      return;
    }

    throw error;
  }
}

async function ensureOperationalSchemaInternal() {
  // Keep runtime schema compatibility limited to support tables owned by the app.
  // Core auth/data tables should be migrated explicitly through SQL/Prisma migrations.

  await executeOptionalSchemaQuery(`
    CREATE TABLE IF NOT EXISTS request_rate_limits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      scope text NOT NULL,
      identifier text NOT NULL,
      window_start timestamptz NOT NULL,
      hit_count integer NOT NULL DEFAULT 1,
      last_hit_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await executeOptionalSchemaQuery(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_request_rate_limits_scope_identifier_window
      ON request_rate_limits(scope, identifier, window_start);
  `);

  await executeOptionalSchemaQuery(`
    CREATE INDEX IF NOT EXISTS idx_request_rate_limits_scope_identifier_last_hit
      ON request_rate_limits(scope, identifier, last_hit_at DESC);
  `);

  await executeOptionalSchemaQuery(`
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
  `);

  await executeOptionalSchemaQuery(`
    CREATE INDEX IF NOT EXISTS idx_recipe_import_jobs_family_status_created
      ON recipe_import_jobs(family_id, status, created_at DESC);
  `);

  await executeOptionalSchemaQuery(`
    CREATE INDEX IF NOT EXISTS idx_recipe_import_jobs_profile_created
      ON recipe_import_jobs(requested_by_profile_id, created_at DESC);
  `);

  await executeOptionalSchemaQuery(`
    CREATE INDEX IF NOT EXISTS idx_recipe_import_jobs_source_hash
      ON recipe_import_jobs(family_id, source_url_hash, created_at DESC);
  `);
}

export async function ensureOperationalSchema() {
  if (!globalForSchema.tableeEnsureOperationalSchema) {
    globalForSchema.tableeEnsureOperationalSchema = ensureOperationalSchemaInternal().catch(
      (error) => {
        globalForSchema.tableeEnsureOperationalSchema = undefined;
        throw error;
      },
    );
  }

  await globalForSchema.tableeEnsureOperationalSchema;
}
