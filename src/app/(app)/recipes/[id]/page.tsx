import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { AddIngredientsToShoppingForm } from "@/components/forms/add-ingredients-to-shopping-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

function formatIngredientQuantity(ingredient: {
  quantity_numeric: { toString(): string } | null;
  raw_quantity_text: string | null;
  unit: string | null;
}) {
  if (ingredient.raw_quantity_text) {
    return ingredient.raw_quantity_text;
  }

  if (!ingredient.quantity_numeric) {
    return null;
  }

  return `${ingredient.quantity_numeric.toString()}${ingredient.unit ? ` ${ingredient.unit}` : ""}`;
}

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { familyId } = await requireActiveFamily();
  const { id } = await params;

  const [recipe, locations] = await Promise.all([
    prisma.recipes.findFirst({
      where: {
        id,
        family_id: familyId,
        archived_at: null,
      },
      include: {
        recipe_ingredients: {
          orderBy: { position: "asc" },
        },
        recipe_steps: {
          orderBy: { position: "asc" },
        },
      },
    }),
    prisma.locations.findMany({
      where: {
        family_id: familyId,
        archived_at: null,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  if (!recipe) {
    notFound();
  }

  const totalMinutes =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-accent/80 to-primary/5 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-primary">Détail recette</p>
            <h2 className="text-3xl font-bold">{recipe.title}</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {recipe.description?.trim() || "Aucune description pour cette recette."}
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {recipe.servings ? (
                <span className="rounded-full bg-background/80 px-2.5 py-1">
                  {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
                </span>
              ) : null}
              {recipe.prep_time_minutes ? (
                <span className="rounded-full bg-background/80 px-2.5 py-1">
                  Préparation {formatDuration(recipe.prep_time_minutes)}
                </span>
              ) : null}
              {recipe.cook_time_minutes ? (
                <span className="rounded-full bg-background/80 px-2.5 py-1">
                  Cuisson {formatDuration(recipe.cook_time_minutes)}
                </span>
              ) : null}
              {totalMinutes ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                  Total {formatDuration(totalMinutes)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className={buttonVariants()}
            >
              Modifier
            </Link>
            <Link
              href="/recipes"
              className={buttonVariants({ variant: "outline" })}
            >
              Retour à la liste
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ingrédients</CardTitle>
              <CardDescription>
                {recipe.recipe_ingredients.length} ingrédient
                {recipe.recipe_ingredients.length > 1 ? "s" : ""} structurés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recipe.recipe_ingredients.map((ingredient) => {
                  const quantity = formatIngredientQuantity(ingredient);

                  return (
                    <li
                      key={ingredient.id}
                      className="rounded-xl border border-border p-3"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium">{ingredient.name}</p>
                          {ingredient.note ? (
                            <p className="text-sm text-muted-foreground">
                              {ingredient.note}
                            </p>
                          ) : null}
                        </div>
                        {quantity ? (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                            {quantity}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Étapes</CardTitle>
              <CardDescription>
                Une progression claire, pensée pour être relue facilement sur mobile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {recipe.recipe_steps.map((step, index) => (
                  <li key={step.id} className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-6">{step.instruction}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Infos rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Portions</span>
                <span>{recipe.servings ?? "Non défini"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Préparation</span>
                <span>{formatDuration(recipe.prep_time_minutes) ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Cuisson</span>
                <span>{formatDuration(recipe.cook_time_minutes) ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Total estimé</span>
                <span>{totalMinutes ? formatDuration(totalMinutes) : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Créée le</span>
                <span>
                  {new Date(recipe.created_at).toLocaleDateString("fr-CH", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {locations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Envoyer aux courses</CardTitle>
                <CardDescription>
                  Choisis explicitement le lieu cible avant d&apos;ajouter les ingrédients.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AddIngredientsToShoppingForm
                  source="recipe"
                  sourceId={recipe.id}
                  defaultLocationId={locations[0].id}
                  locations={locations.map((location) => ({
                    id: location.id,
                    label: location.name,
                  }))}
                  buttonLabel="Ajouter les ingrédients à la liste"
                  description="Une confirmation s'affichera avant l'ajout."
                />
              </CardContent>
            </Card>
          ) : null}

          {recipe.source_url ? (
            <Card>
              <CardHeader>
                <CardTitle>Source</CardTitle>
                <CardDescription>
                  Le lien d&apos;origine reste disponible si tu veux retrouver la recette.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Ouvrir la source
                </a>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
