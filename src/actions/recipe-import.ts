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
    const message =
      error instanceof Error
        ? error.message
        : "L'import IA n'a pas pu aboutir pour ce lien.";

    return { success: false, error: message };
  }
}
