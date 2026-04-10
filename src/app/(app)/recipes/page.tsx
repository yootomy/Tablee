import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { RecipesSearchInput } from "@/components/forms/recipes-search-input";
import { PageHero } from "@/components/layout/page-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

type RecipesPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

function formatMinutes(minutes: number | null) {
  if (!minutes) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!remainingMinutes) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const { familyId } = await requireActiveFamily();
  const resolvedSearchParams = await searchParams;
  const query = Array.isArray(resolvedSearchParams.q)
    ? resolvedSearchParams.q[0]
    : resolvedSearchParams.q;
  const trimmedQuery = query?.trim() ?? "";

  const recipes = await prisma.recipes.findMany({
    where: {
      family_id: familyId,
      archived_at: null,
      ...(trimmedQuery
        ? {
            title: {
              contains: trimmedQuery,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: [{ created_at: "desc" }],
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHero
        eyebrow="Recettes"
        title="Votre carnet de cuisine"
        description="Retrouvez toutes les recettes de la famille active, puis recherchez-les par titre."
        meta={`${recipes.length} recette${recipes.length > 1 ? "s" : ""}${trimmedQuery ? ` • filtre "${trimmedQuery}"` : ""}`}
        action={
          <Link href="/recipes/new" className={buttonVariants({ variant: "outline" })}>
            Ajouter une recette
          </Link>
        }
      >
        <RecipesSearchInput initialValue={trimmedQuery} />
      </PageHero>

      {recipes.length === 0 ? (
        <EmptyState
          title={
            trimmedQuery
              ? "Aucune recette trouvée"
              : "Aucune recette pour l'instant"
          }
          description={
            trimmedQuery
              ? "Essaie un autre mot-clé ou crée une nouvelle recette."
              : "Ajoute votre première recette structurée pour lancer la suite du MVP."
          }
          action={
            <Link href="/recipes/new" className={buttonVariants()}>
              Créer une recette
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {recipes.map((recipe) => {
            const total =
              recipe.prep_time_minutes || recipe.cook_time_minutes
                ? formatMinutes(
                    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0),
                  )
                : null;

            return (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <Card className="overflow-hidden border-primary/10 shadow-sm transition-all group-hover:border-primary/30 group-hover:bg-accent/20 group-hover:shadow-md">
                  <div className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-br from-primary/15 via-accent/50 to-primary/5 px-4 py-3">
                    <div className="absolute right-0 top-0 size-14 translate-x-4 -translate-y-4 rounded-full bg-primary/10" />
                    <div className="absolute bottom-0 left-0 size-10 -translate-x-4 translate-y-4 rounded-full bg-primary/10" />
                    <div className="relative space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                        Recette
                      </p>
                      <CardTitle className="text-base transition-colors group-hover:text-primary sm:text-lg">
                        {recipe.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-1 max-w-xl text-xs text-foreground/70">
                        {recipe.description?.trim() || "Ouvre la fiche pour voir les ingrédients, les étapes et les détails."}
                      </CardDescription>
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      {recipe.servings ? (
                        <span className="rounded-full bg-muted px-2.5 py-1">
                          {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {total ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                          Total {total}
                        </span>
                      ) : null}
                      {!recipe.servings && !total ? (
                        <span className="rounded-full bg-muted px-2.5 py-1">
                          Informations à compléter
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/recipes/new"
        aria-label="Ajouter une recette"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:hidden"
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}
