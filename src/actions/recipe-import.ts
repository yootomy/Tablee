"use server";

import { requireActiveFamily } from "@/lib/auth-utils";
import {
  getImportProvider,
  importRecipeFromSocialUrl,
} from "@/lib/recipe-import";
import {
  createRecipeImportJob,
  markRecipeImportJobCompleted,
  markRecipeImportJobFailed,
} from "@/lib/recipe-import-jobs";
import {
  createRecipeRecord,
  revalidateRecipeSurfaces,
  type RecipePersistencePayload,
} from "@/actions/recipes";

type ImportRecipeResult =
  | { success: true; recipeId: string }
  | { success: false; error: string };

export async function importRecipeFromUrl(
  formData: FormData,
): Promise<ImportRecipeResult> {
  const { familyId, profileId } = await requireActiveFamily();

  const url = formData.get("url");

  if (typeof url !== "string" || !url.trim()) {
    return { success: false, error: "Ajoute un lien TikTok ou Instagram." };
  }

  const provider = getImportProvider();
  let importJobState:
    | Awaited<ReturnType<typeof createRecipeImportJob>>
    | null = null;

  try {
    importJobState = await createRecipeImportJob({
      familyId,
      profileId,
      provider,
      sourceUrl: url.trim(),
    });

    if (importJobState.reusedRecipeId) {
      return { success: true, recipeId: importJobState.reusedRecipeId };
    }

    const draft = await importRecipeFromSocialUrl(url.trim());
    const recipe = await createRecipeRecord({
      familyId,
      profileId,
      data: draftToPayload(draft),
    });

    if (importJobState.job) {
      await markRecipeImportJobCompleted({
        jobId: importJobState.job.id,
        recipeId: recipe.id,
        metadata: {
          confidence: draft.confidence,
          warnings: draft.warnings,
          imageUrl: draft.imageUrl,
          source: draft.source,
        },
      });
    }

    await revalidateRecipeSurfaces(recipe.id);
    return { success: true, recipeId: recipe.id };
  } catch (error) {
    const message = formatImportErrorMessage(error);

    if (importJobState?.job) {
      try {
        await markRecipeImportJobFailed({
          jobId: importJobState.job.id,
          errorMessage: message,
        });
      } catch {
        // best-effort only
      }
    }

    return { success: false, error: message };
  }
}

function draftToPayload(draft: Awaited<ReturnType<typeof importRecipeFromSocialUrl>>): RecipePersistencePayload {
  return {
    title: draft.title,
    description: draft.description || undefined,
    prepTimeMinutes: draft.prepTimeMinutes ? Number(draft.prepTimeMinutes) : undefined,
    cookTimeMinutes: draft.cookTimeMinutes ? Number(draft.cookTimeMinutes) : undefined,
    servings: draft.servings ? Number(draft.servings) : undefined,
    sourceUrl: draft.sourceUrl || undefined,
    imageUrl: draft.imageUrl || undefined,
    ingredients: draft.ingredients,
    steps: draft.steps,
  };
}

function formatImportErrorMessage(error: unknown) {
  const message = getImportErrorMessage(error);

  if (!message) {
    return "L'import IA n'a pas pu aboutir pour ce lien.";
  }

  if (
    message.includes("quota") ||
    message.includes("billing") ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED")
  ) {
    return "L'import IA est bien branché, mais le quota du fournisseur IA configuré est actuellement dépassé. Vérifie la facturation ou le free tier associé à la clé utilisée.";
  }

  if (
    message.includes("OPENAI_API_KEY") ||
    message.includes("GEMINI_API_KEY") ||
    message.includes("API key not valid")
  ) {
    return "La clé du fournisseur IA n'est pas configurée correctement sur le serveur.";
  }

  if (message.includes("UNAVAILABLE") || message.includes("high demand")) {
    return "Le fournisseur IA est temporairement surchargé. Réessaie dans un instant.";
  }

  return message;
}

function getImportErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }

    if (
      "error" in error &&
      typeof error.error === "object" &&
      error.error !== null &&
      "message" in error.error &&
      typeof error.error.message === "string"
    ) {
      return error.error.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return null;
    }
  }

  return null;
}
