import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { AddIngredientsToShoppingForm } from "@/components/forms/add-ingredients-to-shopping-form";
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

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h${rem}` : `${hours}h`;
}

function formatIngredientQuantity(ingredient: {
  quantity_numeric: { toString(): string } | null;
  raw_quantity_text: string | null;
  unit: string | null;
}) {
  if (ingredient.raw_quantity_text) return ingredient.raw_quantity_text;
  if (!ingredient.quantity_numeric) return null;
  return `${ingredient.quantity_numeric.toString()}${ingredient.unit ? ` ${ingredient.unit}` : ""}`;
}

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { familyId } = await requireActiveFamily();
  const { id } = await params;

  const [recipe, locations] = await Promise.all([
    prisma.recipes.findFirst({
      where: { id, family_id: familyId, archived_at: null },
      include: {
        recipe_ingredients: { orderBy: { position: "asc" } },
        recipe_steps: { orderBy: { position: "asc" } },
      },
    }),
    prisma.locations.findMany({
      where: { family_id: familyId, archived_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!recipe) notFound();

  const totalMinutes =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

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
      {/* Header compact */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-accent/80 to-primary/5 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href="/recipes"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Recettes
          </Link>
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className={buttonVariants({ size: "sm" })}
          >
            <Pencil className="size-3.5" />
            Modifier
          </Link>
        </div>

        <h1 className="text-2xl font-bold sm:text-3xl">{recipe.title}</h1>
        {recipe.description?.trim() ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {recipe.description}
          </p>
        ) : null}

        {stats.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground"
              >
                <s.icon className="size-3.5" />
                {s.label}
              </span>
            ))}
          </div>
        ) : null}

        {recipe.source_url ? (
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            Source originale
          </a>
        ) : null}
      </div>

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
                  const qty = formatIngredientQuantity(ingredient);
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
                  defaultLocationId={locations[0].id}
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
