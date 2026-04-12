"use client";

import { useMemo, useState } from "react";
import { RecipeForm } from "@/components/forms/recipe-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { ImportRecipeDialog } from "@/components/recipes/import-recipe-dialog";
import type { ImportedRecipeDraft, RecipeFormDraft } from "@/types/recipe-import";
import { ChefHat, Sparkles } from "lucide-react";

const blankDraft: RecipeFormDraft = {
  title: "",
  description: "",
  prepTimeMinutes: "",
  cookTimeMinutes: "",
  servings: "",
  sourceUrl: "",
  imageUrl: "",
  ingredients: [],
  steps: [{ instruction: "" }],
};

export function NewRecipePageShell() {
  const [importedDraft, setImportedDraft] = useState<ImportedRecipeDraft | null>(
    null,
  );
  const [formVersion, setFormVersion] = useState(0);

  const formValues = useMemo<RecipeFormDraft>(
    () => importedDraft ?? blankDraft,
    [importedDraft],
  );

  function handleImported(draft: ImportedRecipeDraft) {
    setImportedDraft(draft);
    setFormVersion((current) => current + 1);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Recettes"
        title="Nouvelle recette"
        description="Saisis l’essentiel à la main, ou laisse Tablee te préparer un premier brouillon depuis une vidéo TikTok ou Instagram."
        badges={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <ChefHat className="size-3.5" />
              Création guidée
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              <Sparkles className="size-3.5" />
              Import IA
            </span>
          </>
        }
        action={<ImportRecipeDialog onImported={handleImported} />}
      >
        {importedDraft ? (
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/90 backdrop-blur-sm">
            <p className="font-semibold">
              Brouillon importé depuis{" "}
              {importedDraft.source.platform === "tiktok"
                ? "TikTok"
                : "Instagram"}
            </p>
            <p className="mt-1 text-white/75">
              {importedDraft.confidence !== null
                ? `Confiance estimée : ${Math.round(importedDraft.confidence * 100)}%.`
                : "Confiance non calculée."}{" "}
              Relis toujours les ingrédients et les quantités avant
              d&apos;enregistrer.
            </p>
            {importedDraft.warnings.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-white/75">
                {importedDraft.warnings.slice(0, 3).map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </AppPageHeader>

      <RecipeForm key={formVersion} mode="create" initialValues={formValues} />
    </div>
  );
}
