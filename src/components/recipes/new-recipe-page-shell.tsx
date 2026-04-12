"use client";

import { RecipeForm } from "@/components/forms/recipe-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { ChefHat } from "lucide-react";

export function NewRecipePageShell() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Recettes"
        title="Nouvelle recette"
        description="Saisis l’essentiel à la main pour composer une fiche claire et facile à retrouver pour toute la famille."
        badges={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
            <ChefHat className="size-3.5" />
            Création manuelle
          </span>
        }
      />

      <RecipeForm mode="create" />
    </div>
  );
}
