import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { getPreferredLocationId } from "@/lib/location-preferences";
import { resolveRecipeMediaUrl } from "@/lib/media-url";
import { formatDuration, formatQuantity } from "@/lib/formatters";
import { AddIngredientsToShoppingForm } from "@/components/forms/add-ingredients-to-shopping-form";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  ChefHat,
  Flame,
  Users,
  ExternalLink,
  Pencil,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { familyId, profileId } = await requireActiveFamily();
  const { id } = await params;

  const [recipe, locations, familyContextPreferences] = await Promise.all([
    prisma.recipes.findFirst({
      where: { id, family_id: familyId, archived_at: null },
      include: {
        recipe_ingredients: { orderBy: { position: "asc" } },
        recipe_steps: { orderBy: { position: "asc" } },
      },
    }),
    prisma.locations.findMany({
      where: { family_id: familyId, archived_at: null },
      orderBy: { created_at: "asc" },
      select: { id: true, name: true },
    }),
    prisma.family_context_preferences.findUnique({
      where: {
        profile_id_family_id: {
          profile_id: profileId,
          family_id: familyId,
        },
      },
      select: {
        last_selected_location_id: true,
      },
    }),
  ]);

  if (!recipe) notFound();

  const totalMinutes =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const recipeImageUrl = resolveRecipeMediaUrl(recipe.id, recipe.image_url);
  const preferredLocationId = getPreferredLocationId(
    locations,
    familyContextPreferences?.last_selected_location_id,
  );

  const stats = [
    recipe.servings
      ? { icon: Users, label: `${recipe.servings} portion${recipe.servings > 1 ? "s" : ""}` }
      : null,
    recipe.prep_time_minutes
      ? { icon: ChefHat, label: `Prépa ${formatDuration(recipe.prep_time_minutes)}` }
      : null,
    recipe.cook_time_minutes
      ? { icon: Flame, label: `Cuisson ${formatDuration(recipe.cook_time_minutes)}` }
      : null,
    totalMinutes
      ? { icon: Clock, label: `Total ${formatDuration(totalMinutes)}` }
      : null,
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string }[];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Recettes"
        title={recipe.title}
        description={
          recipe.description?.trim() ||
          "Une fiche claire à ouvrir seulement quand tu veux tous les détails."
        }
        backgroundImageUrl={recipeImageUrl ?? undefined}
        badges={
          <>
            {stats.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90 backdrop-blur-sm"
              >
                <s.icon className="size-3.5" />
                {s.label}
              </span>
            ))}
          </>
        }
        action={
          <>
            <Link
              href="/recipes"
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className: "border-white/20 bg-white/95 text-foreground hover:bg-white",
              })}
            >
              <ArrowLeft className="size-3.5" />
              Recettes
            </Link>
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className: "border-white/20 bg-white/95 text-foreground hover:bg-white",
              })}
            >
              <Pencil className="size-3.5" />
              Modifier
            </Link>
            <DeleteRecipeButton recipeId={recipe.id} recipeTitle={recipe.title} />
          </>
        }
      >
        {recipe.source_url ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-white/75 hover:text-white hover:underline"
            >
              <ExternalLink className="size-3" />
              Source originale
            </a>
          </div>
        ) : null}
      </AppPageHeader>

      {/* Contenu principal */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Colonne gauche : ingrédients + étapes */}
        <div className="space-y-4">
          {/* Ingrédients */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Ingrédients
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({recipe.recipe_ingredients.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y">
                {recipe.recipe_ingredients.map((ingredient) => {
                  const qty = formatQuantity(ingredient);
                  return (
                    <li
                      key={ingredient.id}
                      className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium">
                          {ingredient.name}
                        </span>
                        {ingredient.note ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({ingredient.note})
                          </span>
                        ) : null}
                      </div>
                      {qty ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {qty}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Étapes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Préparation
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({recipe.recipe_steps.length} étape{recipe.recipe_steps.length > 1 ? "s" : ""})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-3">
                {recipe.recipe_steps.map((step, i) => (
                  <li key={step.id} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{step.instruction}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite : actions */}
        <div className="space-y-4">
          {locations.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="size-4" />
                  Envoyer aux courses
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <AddIngredientsToShoppingForm
                  source="recipe"
                  sourceId={recipe.id}
                  defaultLocationId={preferredLocationId ?? locations[0].id}
                  locations={locations.map((l) => ({
                    id: l.id,
                    label: l.name,
                  }))}
                  buttonLabel="Ajouter les ingrédients"
                  description="Les ingrédients seront ajoutés à la liste de courses du lieu choisi."
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="space-y-2 pt-5 text-xs text-muted-foreground">
              <p>
                Créée le{" "}
                {new Date(recipe.created_at).toLocaleDateString("fr-CH", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {recipe.updated_at > recipe.created_at ? (
                <p>
                  Modifiée le{" "}
                  {new Date(recipe.updated_at).toLocaleDateString("fr-CH", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
