import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { RecipesSearchInput } from "@/components/forms/recipes-search-input";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChefHat, Clock, Users } from "lucide-react";

type RecipesPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

function formatMinutes(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h${rem}` : `${hours}h`;
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
        ? { title: { contains: trimmedQuery, mode: "insensitive" } }
        : {}),
    },
    orderBy: [{ created_at: "desc" }],
  });

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Recettes"
        title="Carnet de cuisine"
        description="Retrouve toutes les recettes de la famille, puis ouvre une fiche complète seulement quand tu en as besoin."
        badges={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
            <ChefHat className="size-3.5" />
            {recipes.length} recette{recipes.length > 1 ? "s" : ""}
            {trimmedQuery ? ` pour "${trimmedQuery}"` : ""}
          </span>
        }
        action={
          <Link
            href="/recipes/new"
            className={buttonVariants({
              size: "sm",
              variant: "outline",
              className: "border-white/20 bg-white/95 text-foreground hover:bg-white",
            })}
          >
            <Plus className="size-3.5" />
            Ajouter
          </Link>
        }
      >
        <RecipesSearchInput initialValue={trimmedQuery} />
      </AppPageHeader>

      {/* Contenu */}
      {recipes.length === 0 ? (
        <EmptyState
          title={trimmedQuery ? "Aucune recette trouvée" : "Aucune recette pour l'instant"}
          description={
            trimmedQuery
              ? "Essaie un autre mot-clé ou crée une nouvelle recette."
              : "Ajoutez votre première recette pour commencer."
          }
          action={
            <Link href="/recipes/new" className={buttonVariants()}>
              Créer une recette
            </Link>
          }
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Toutes les recettes
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({recipes.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y">
              {recipes.map((recipe) => {
                const total =
                  recipe.prep_time_minutes || recipe.cook_time_minutes
                    ? formatMinutes(
                        (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0),
                      )
                    : null;

                return (
                  <li key={recipe.id}>
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="group flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium group-hover:text-primary">
                          {recipe.title}
                        </p>
                        {recipe.description?.trim() ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {recipe.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {recipe.servings ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="size-3" />
                            {recipe.servings}
                          </span>
                        ) : null}
                        {total ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {total}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
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
