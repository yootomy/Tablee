"use client";

import Link from "next/link";
import { ImportRecipeDialog } from "@/components/recipes/import-recipe-dialog";

type RecipeImportSpotlightProps = {
  isPremium: boolean;
  isBlocked: boolean;
  quotaHeadline: string;
};

export function RecipeImportSpotlight({
  isPremium,
  isBlocked,
  quotaHeadline,
}: RecipeImportSpotlightProps) {
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
              Colle un lien TikTok ou Instagram. Tablee analyse la vidéo ou le
              diaporama photo, garde l’image principale quand elle est
              récupérable, puis ajoute la recette directement à ta collection.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/8 px-2.5 py-1 text-primary ring-1 ring-primary/10">
              TikTok ou Instagram
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 ring-1 ring-border">
              Ajout direct
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 ring-1 ring-border">
              {isPremium ? "Premium" : "Free"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{quotaHeadline}</p>
          {isBlocked && !isPremium ? (
            <p className="text-sm text-muted-foreground">
              Le quota gratuit est atteint. Passe au Premium pour profiter de plus
              d&apos;imports IA.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <ImportRecipeDialog
            buttonLabel="Importer un lien"
            buttonVariant="default"
            buttonClassName="shrink-0 shadow-sm"
            disabled={isBlocked}
          />
          {isBlocked ? (
            <Link
              href="/profile/billing"
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir l&apos;abonnement Premium
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
