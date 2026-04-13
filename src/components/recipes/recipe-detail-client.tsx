"use client";

import { useState } from "react";
import { Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddIngredientsToShoppingDialog } from "@/components/forms/add-ingredients-to-shopping-dialog";

type SerializedIngredient = {
  id: string;
  name: string;
  quantity_numeric: number | null;
  unit: string | null;
  raw_quantity_text: string | null;
  note: string | null;
};

type SerializedStep = {
  id: string;
  instruction: string;
};

type LocationOption = {
  id: string;
  label: string;
};

type RecipeDetailClientProps = {
  baseServings: number | null;
  ingredients: SerializedIngredient[];
  steps: SerializedStep[];
  recipeId: string;
  locations: LocationOption[];
  defaultLocationId: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatScaledQty(base: number, multiplier: number, unit: string | null): string {
  const scaled = base * multiplier;
  const text = Number.isInteger(scaled) ? String(scaled) : parseFloat(scaled.toFixed(2)).toString();
  return unit ? `${text} ${unit}` : text;
}

export function RecipeDetailClient({
  baseServings,
  ingredients,
  steps,
  recipeId,
  locations,
  defaultLocationId,
  createdAt,
  updatedAt,
}: RecipeDetailClientProps) {
  const [currentServings, setCurrentServings] = useState(baseServings ?? 2);

  const showScaler = baseServings !== null && baseServings > 0;
  const multiplier = showScaler ? currentServings / baseServings! : 1;

  const createdDate = new Date(createdAt).toLocaleDateString("fr-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const updatedDate = new Date(updatedAt).toLocaleDateString("fr-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const showUpdated = updatedAt !== createdAt;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Colonne gauche : ingrédients + étapes */}
      <div className="space-y-4">
        {/* Ingrédients */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">
                Ingrédients
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({ingredients.length})
                </span>
              </CardTitle>

              {showScaler ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setCurrentServings((s) => Math.max(1, s - 1))}
                    aria-label="Réduire les portions"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="flex min-w-[4rem] items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3.5 shrink-0" />
                    {currentServings} portion{currentServings > 1 ? "s" : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setCurrentServings((s) => s + 1)}
                    aria-label="Augmenter les portions"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y">
              {ingredients.map((ingredient) => {
                const canScale = ingredient.quantity_numeric !== null;
                const qtyText =
                  canScale
                    ? formatScaledQty(ingredient.quantity_numeric!, multiplier, ingredient.unit)
                    : (ingredient.raw_quantity_text ?? null);

                return (
                  <li
                    key={ingredient.id}
                    className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{ingredient.name}</span>
                      {ingredient.note ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({ingredient.note})
                        </span>
                      ) : null}
                    </div>
                    {qtyText ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {showScaler && !canScale && multiplier !== 1 ? "~" : ""}
                        {qtyText}
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
                ({steps.length} étape{steps.length > 1 ? "s" : ""})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="space-y-3">
              {steps.map((step, i) => (
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

      {/* Colonne droite : courses + méta */}
      <div className="space-y-4">
        {locations.length > 0 && defaultLocationId ? (
          <Card>
            <CardContent className="pt-5">
              <p className="mb-3 text-sm text-muted-foreground">
                Choisissez les ingrédients à ajouter à la liste de courses.
              </p>
              <AddIngredientsToShoppingDialog
                recipeId={recipeId}
                ingredients={ingredients.map((ing) => ({
                  id: ing.id,
                  name: ing.name,
                  quantityLabel:
                    ing.quantity_numeric !== null
                      ? formatScaledQty(ing.quantity_numeric, multiplier, ing.unit)
                      : (ing.raw_quantity_text ?? null),
                }))}
                locations={locations}
                defaultLocationId={defaultLocationId}
                targetServings={showScaler ? currentServings : undefined}
              />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="space-y-2 pt-5 text-xs text-muted-foreground">
            <p>
              Créée le {createdDate}
            </p>
            {showUpdated ? (
              <p>Modifiée le {updatedDate}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
