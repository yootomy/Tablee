"use client";

import { ImportRecipeDialog } from "@/components/recipes/import-recipe-dialog";

export function RecipeImportSpotlight() {
  return (
    <section className="rounded-2xl border border-primary/15 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
            Import intelligent
          </p>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
              Ajouter une recette depuis un lien
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Colle un lien TikTok ou Instagram. Tablee analyse la vidéo, garde
              la miniature quand elle est récupérable, puis ajoute la recette
              directement à ta collection.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/8 px-2.5 py-1 text-primary ring-1 ring-primary/10">
              TikTok ou Instagram
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 ring-1 ring-border">
              Ajout direct
            </span>
          </div>
        </div>

        <ImportRecipeDialog
          buttonLabel="Importer un lien"
          buttonVariant="default"
          buttonClassName="shrink-0 shadow-sm"
        />
      </div>
    </section>
  );
}
