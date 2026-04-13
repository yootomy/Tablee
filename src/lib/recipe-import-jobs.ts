import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureOperationalSchema } from "@/lib/app-schema";
import { RateLimitExceededError, assertRateLimit } from "@/lib/rate-limit";

const STALE_IMPORT_MS = 30 * 60 * 1000;
const FAMILY_DAILY_IMPORT_LIMIT = Number(
  process.env.AI_RECIPE_IMPORT_FAMILY_DAILY_LIMIT ?? 25,
);
const PROFILE_DAILY_IMPORT_LIMIT = Number(
  process.env.AI_RECIPE_IMPORT_PROFILE_DAILY_LIMIT ?? 8,
);
const MAX_CONCURRENT_IMPORTS_PER_FAMILY = Number(
  process.env.AI_RECIPE_IMPORT_MAX_CONCURRENT_PER_FAMILY ?? 1,
);

function normalizeSocialSourceUrl(url: string) {
  try {
    const parsed = new URL(url.trim());
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function hashSourceUrl(url: string) {
  return crypto.createHash("sha256").update(normalizeSocialSourceUrl(url)).digest("hex");
}

export async function cleanupStaleRecipeImportJobs() {
  await ensureOperationalSchema();

  const staleBefore = new Date(Date.now() - STALE_IMPORT_MS);
  await prisma.recipe_import_jobs.updateMany({
    where: {
      status: "processing",
      updated_at: { lt: staleBefore },
    },
    data: {
      status: "failed",
      error_message: "Import interrompu ou abandonné par le serveur.",
      finished_at: new Date(),
      updated_at: new Date(),
    },
  });
}

export async function createRecipeImportJob(input: {
  familyId: string;
  profileId: string;
  provider: string;
  sourceUrl: string;
}) {
  await ensureOperationalSchema();
  await cleanupStaleRecipeImportJobs();

  await assertRateLimit({
    scope: "recipe-import:profile:day",
    identifier: input.profileId,
    limit: PROFILE_DAILY_IMPORT_LIMIT,
    windowMs: 24 * 60 * 60 * 1000,
    message:
      "Tu as atteint la limite quotidienne d'imports IA pour ton compte. Réessaie demain.",
  });

  await assertRateLimit({
    scope: "recipe-import:family:day",
    identifier: input.familyId,
    limit: FAMILY_DAILY_IMPORT_LIMIT,
    windowMs: 24 * 60 * 60 * 1000,
    message:
      "Cette famille a atteint sa limite quotidienne d'imports IA. Réessaie demain.",
  });

  const sourceUrlHash = hashSourceUrl(input.sourceUrl);
  const now = new Date();
  const recentCutoff = new Date(Date.now() - STALE_IMPORT_MS);

  const [concurrentCount, matchingRecentJob] = await Promise.all([
    prisma.recipe_import_jobs.count({
      where: {
        family_id: input.familyId,
        status: "processing",
        updated_at: { gte: recentCutoff },
      },
    }),
    prisma.recipe_import_jobs.findFirst({
      where: {
        family_id: input.familyId,
        source_url_hash: sourceUrlHash,
        created_at: { gte: recentCutoff },
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  if (concurrentCount >= MAX_CONCURRENT_IMPORTS_PER_FAMILY) {
    throw new RateLimitExceededError(
      "Un autre import IA est déjà en cours pour cette famille. Attends qu'il se termine avant d'en lancer un nouveau.",
      60,
    );
  }

  if (matchingRecentJob?.status === "processing") {
    throw new Error("Cette vidéo est déjà en cours d'import pour cette famille.");
  }

  if (matchingRecentJob?.status === "completed" && matchingRecentJob.recipe_id) {
    return {
      reusedRecipeId: matchingRecentJob.recipe_id,
      job: null,
    };
  }

  const job = await prisma.recipe_import_jobs.create({
    data: {
      family_id: input.familyId,
      requested_by_profile_id: input.profileId,
      provider: input.provider,
      source_url: normalizeSocialSourceUrl(input.sourceUrl),
      source_url_hash: sourceUrlHash,
      status: "processing",
      started_at: now,
      updated_at: now,
    },
  });

  return {
    reusedRecipeId: null,
    job,
  };
}

export async function markRecipeImportJobCompleted(input: {
  jobId: string;
  recipeId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.recipe_import_jobs.update({
    where: { id: input.jobId },
    data: {
      status: "completed",
      recipe_id: input.recipeId,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      finished_at: new Date(),
      updated_at: new Date(),
      error_message: null,
    },
  });
}

export async function markRecipeImportJobFailed(input: {
  jobId: string;
  errorMessage: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.recipe_import_jobs.update({
    where: { id: input.jobId },
    data: {
      status: "failed",
      error_message: input.errorMessage,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      finished_at: new Date(),
      updated_at: new Date(),
    },
  });
}
