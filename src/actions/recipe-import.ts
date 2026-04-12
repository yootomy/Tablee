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

  return message;
}
