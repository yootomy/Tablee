import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureOperationalSchema } from "@/lib/app-schema";
import {
  countProfileImportsInRolling24Hours,
  resolveFamilyEntitlements,
} from "@/lib/family-billing";
import { RateLimitExceededError } from "@/lib/rate-limit";

const STALE_IMPORT_MS = 30 * 60 * 1000;
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

  const [entitlements, profileRolling24hUsage] = await Promise.all([
    resolveFamilyEntitlements(input.familyId),
    countProfileImportsInRolling24Hours(input.profileId),
  ]);

  if (profileRolling24hUsage >= entitlements.aiLimits.hiddenProfileRolling24h) {
    throw new RateLimitExceededError(
      "Tu as atteint la limite cachée d'imports IA pour ton compte sur 24 heures. Réessaie demain.",
      60,
    );
  }

  if (
    entitlements.aiUsage.familyRolling30DayUsed >= entitlements.aiLimits.familyRolling30Day
  ) {
    throw new RateLimitExceededError(
      entitlements.plan === "premium"
        ? "Cette famille a atteint sa limite d'imports IA sur 30 jours. Réessaie plus tard."
        : "Le quota gratuit de 5 imports IA sur 30 jours est atteint pour cette famille. Passe au Premium pour débloquer plus d'imports.",
      60,
    );
  }

  if (
    entitlements.aiLimits.familyRolling24h !== null &&
    entitlements.aiUsage.familyRolling24hUsed >= entitlements.aiLimits.familyRolling24h
  ) {
    throw new RateLimitExceededError(
      "Cette famille a atteint sa limite Premium d'imports IA pour les dernières 24 heures. Réessaie demain.",
      60,
    );
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

export async function getRecentRecipeImportJobsForFamily(familyId: string, limit = 12) {
  await ensureOperationalSchema();

  return prisma.recipe_import_jobs.findMany({
    where: {
      family_id: familyId,
    },
    orderBy: [{ created_at: "desc" }],
    take: limit,
  });
}
