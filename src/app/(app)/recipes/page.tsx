import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { getAiQuotaHeadline, resolveFamilyEntitlements } from "@/lib/family-billing";
import { RecipesSearchInput } from "@/components/forms/recipes-search-input";
import { RecipeImportSpotlight } from "@/components/recipes/recipe-import-spotlight";
import { RecipesListView } from "@/components/recipes/recipes-list-view";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Plus, ChefHat } from "lucide-react";

type RecipesPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const { familyId } = await requireActiveFamily();
  const resolvedSearchParams = await searchParams;
  const query = Array.isArray(resolvedSearchParams.q)
    ? resolvedSearchParams.q[0]
    : resolvedSearchParams.q;
  const trimmedQuery = query?.trim() ?? "";

  const [recipes, entitlements] = await Promise.all([
    prisma.recipes.findMany({
      where: {
        family_id: familyId,
        archived_at: null,
        ...(trimmedQuery
          ? { title: { contains: trimmedQuery, mode: "insensitive" } }
          : {}),
      },
      orderBy: [{ created_at: "desc" }],
    }),
    resolveFamilyEntitlements(familyId),
  ]);
  const isPremium = entitlements.plan === "premium";
  const isBlocked = isPremium
    ? (entitlements.aiUsage.familyRolling24hRemaining ?? 0) <= 0 ||
      entitlements.aiUsage.familyRolling30DayRemaining <= 0
    : entitlements.aiUsage.familyRolling30DayRemaining <= 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
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
      >
        <RecipesSearchInput initialValue={trimmedQuery} />
      </AppPageHeader>

      <RecipeImportSpotlight
        isPremium={isPremium}
        isBlocked={isBlocked}
        quotaHeadline={getAiQuotaHeadline(entitlements)}
      />

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
        <RecipesListView
          recipes={recipes.map((r) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            prep_time_minutes: r.prep_time_minutes,
            cook_time_minutes: r.cook_time_minutes,
            servings: r.servings,
            image_url: r.image_url,
          }))}
        />
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
