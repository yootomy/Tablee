"use client";

import { useState } from "react";
import {
  addMealIngredientsToShopping,
  addRecipeIngredientsToShopping,
} from "@/actions/shopping";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface LocationOption {
  id: string;
  label: string;
}

interface AddIngredientsToShoppingFormProps {
  source: "recipe" | "meal";
  sourceId: string;
  defaultLocationId: string;
  locations: LocationOption[];
  buttonLabel: string;
  description?: string;
  targetServings?: number;
}

export function AddIngredientsToShoppingForm({
  source,
  sourceId,
  defaultLocationId,
  locations,
  buttonLabel,
  description,
  targetServings,
}: AddIngredientsToShoppingFormProps) {
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const selectedLocation = locations.find(
      (location) => location.id === locationId,
    );

    if (
      !window.confirm(
        `Ajouter les ingrédients à la liste de courses de "${selectedLocation?.label ?? "ce lieu"}" ?`,
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result =
      source === "recipe"
        ? await addRecipeIngredientsToShopping(formData)
        : await addMealIngredientsToShopping(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccessMessage("Les ingrédients ont bien été ajoutés à la liste.");
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {source === "recipe" ? (
        <input type="hidden" name="recipeId" value={sourceId} />
      ) : (
        <input type="hidden" name="mealPlanId" value={sourceId} />
      )}
      {targetServings !== undefined ? (
        <input type="hidden" name="targetServings" value={String(targetServings)} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`shopping-location-${source}-${sourceId}`}>
          Lieu cible
        </Label>
        <select
          id={`shopping-location-${source}-${sourceId}`}
          name="locationId"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:h-10 md:text-sm"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label}
            </option>
          ))}
        </select>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          {successMessage}
        </p>
      ) : null}

      <Button type="submit" disabled={loading}>
        {loading ? "Ajout..." : buttonLabel}
      </Button>
    </form>
  );
}
