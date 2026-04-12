"use client";

import { ImportRecipeDialog } from "@/components/recipes/import-recipe-dialog";
import { Sparkles, WandSparkles, Link2 } from "lucide-react";

export function RecipeImportSpotlight() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-[linear-gradient(135deg,rgba(20,119,88,0.08),rgba(132,204,22,0.12),rgba(34,197,94,0.08))] p-4 shadow-sm sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 size-32 rounded-full bg-lime-300/20 blur-3xl" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur-sm">
            <Sparkles className="size-3.5" />
            Nouveauté IA
          </span>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
              Transforme un lien TikTok ou Instagram en vraie recette
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Colle un lien, Tablee analyse la vidéo, récupère la miniature et
              ajoute directement la recette à ta collection.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 ring-1 ring-border">
              <Link2 className="size-3.5 text-primary" />
              TikTok & Instagram
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 ring-1 ring-border">
              <WandSparkles className="size-3.5 text-primary" />
              Ajout direct
            </span>
          </div>
        </div>

        <ImportRecipeDialog
          buttonLabel="Importer un lien"
          buttonClassName="shrink-0 rounded-full bg-[linear-gradient(135deg,#0f7c58,#16a34a,#84cc16)] text-white shadow-lg hover:opacity-95"
        />
      </div>
    </section>
  );
}
