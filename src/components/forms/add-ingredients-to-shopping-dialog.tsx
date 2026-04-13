"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Check } from "lucide-react";
import { addSelectedIngredientsToShopping } from "@/actions/shopping";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IngredientOption = {
  id: string;
  name: string;
  quantityLabel: string | null;
};

type LocationOption = {
  id: string;
  label: string;
};

interface AddIngredientsToShoppingDialogProps {
  recipeId: string;
  ingredients: IngredientOption[];
  locations: LocationOption[];
  defaultLocationId: string;
  targetServings?: number;
}

export function AddIngredientsToShoppingDialog({
  recipeId,
  ingredients,
  locations,
  defaultLocationId,
  targetServings,
}: AddIngredientsToShoppingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(ingredients.map((i) => i.id)),
  );
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = selectedIds.size === ingredients.length;
  const noneSelected = selectedIds.size === 0;

  function toggleIngredient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ingredients.map((i) => i.id)));
    }
  }

  function handleOpen() {
    setSelectedIds(new Set(ingredients.map((i) => i.id)));
    setLocationId(defaultLocationId);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit() {
    if (noneSelected) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("recipeId", recipeId);
    formData.set("locationId", locationId);
    for (const id of selectedIds) {
      formData.append("ingredientId", id);
    }
    if (targetServings !== undefined) {
      formData.set("targetServings", String(targetServings));
    }

    const result = await addSelectedIngredientsToShopping(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={handleOpen} className="w-full sm:w-auto">
        <ShoppingCart className="size-4" />
        Envoyer aux courses
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center [padding-bottom:env(safe-area-inset-bottom)]"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ingredients-dialog-title"
            className="flex w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:max-w-md sm:rounded-3xl"
            style={{ maxHeight: "min(90dvh, 640px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h3
                id="ingredients-dialog-title"
                className="text-base font-bold"
              >
                Choisir les ingrédients
              </h3>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Ingredient list */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {/* Select all toggle */}
              <button
                type="button"
                onClick={toggleAll}
                className="mb-3 text-xs font-medium text-primary hover:underline"
              >
                {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>

              <ul className="divide-y">
                {ingredients.map((ingredient) => {
                  const checked = selectedIds.has(ingredient.id);
                  return (
                    <li key={ingredient.id}>
                      <button
                        type="button"
                        onClick={() => toggleIngredient(ingredient.id)}
                        className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:text-foreground"
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background",
                          )}
                        >
                          {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-sm font-medium leading-snug">
                            {ingredient.name}
                          </span>
                          {ingredient.quantityLabel ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {ingredient.quantityLabel}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Footer */}
            <div className="shrink-0 space-y-3 border-t border-border px-5 py-4">
              {locations.length > 1 ? (
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:h-10 md:text-sm"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || noneSelected}
                >
                  {loading
                    ? "Ajout..."
                    : `Ajouter ${selectedIds.size} ingrédient${selectedIds.size > 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
