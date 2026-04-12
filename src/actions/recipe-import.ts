"use server";

import { requireActiveFamily } from "@/lib/auth-utils";
import { importRecipeFromSocialUrl } from "@/lib/recipe-import";
import type { ImportedRecipeDraft } from "@/types/recipe-import";

type ImportRecipeResult =
  | { success: true; draft: ImportedRecipeDraft }
  | { success: false; error: string };

export async function importRecipeFromUrl(
  formData: FormData,
): Promise<ImportRecipeResult> {
  await requireActiveFamily();

  const url = formData.get("url");

  if (typeof url !== "string" || !url.trim()) {
    return { success: false, error: "Ajoute un lien TikTok ou Instagram." };
  }

  try {
    const draft = await importRecipeFromSocialUrl(url.trim());
    return { success: true, draft };
  } catch (error) {
    const message = formatImportErrorMessage(error);

    return { success: false, error: message };
  }
}

function formatImportErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "L'import IA n'a pas pu aboutir pour ce lien.";
  }

  const message = error.message;

  if (
    message.includes("quota") ||
    message.includes("billing") ||
    message.includes("429")
  ) {
    return "L'import IA est bien branché, mais le quota OpenAI du projet est actuellement dépassé. Vérifie la facturation ou recharge le compte OpenAI.";
  }

  if (message.includes("OPENAI_API_KEY")) {
    return "La clé OpenAI n'est pas configurée correctement sur le serveur.";
  }

  return message;
}
