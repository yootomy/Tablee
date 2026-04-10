"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createMealPlan,
  deleteMealPlan,
  updateMealPlan,
} from "@/actions/meal-plans";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
}

interface MealPlanFormProps {
  mode: "create" | "edit";
  mealPlanId?: string;
  initialValues: {
    mealDate: string;
    mealSlot: "lunch" | "dinner";
    locationId: string;
    recipeId: string;
    responsibleProfileId: string;
    title: string;
    notes: string;
    status: "planned" | "done" | "canceled";
  };
  recipes: Option[];
  locations: Option[];
  members: Option[];
  returnHref: string;
}

const selectClassName =
  "h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:h-10 md:text-sm";

export function MealPlanForm({
  mode,
  mealPlanId,
  initialValues,
  recipes,
  locations,
  members,
  returnHref,
}: MealPlanFormProps) {
  const [mealDate, setMealDate] = useState(initialValues.mealDate);
  const [mealSlot, setMealSlot] = useState(initialValues.mealSlot);
  const [locationId, setLocationId] = useState(initialValues.locationId);
  const [recipeId, setRecipeId] = useState(initialValues.recipeId);
  const [responsibleProfileId, setResponsibleProfileId] = useState(
    initialValues.responsibleProfileId,
  );
  const [title, setTitle] = useState(initialValues.title);
  const [notes, setNotes] = useState(initialValues.notes);
  const [status, setStatus] = useState(initialValues.status);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMore, setShowMore] = useState(
    mode === "edit" || !!initialValues.notes || !!initialValues.responsibleProfileId,
  );

  const recipeTitleById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe.label])),
    [recipes],
  );

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result =
      mode === "create"
        ? await createMealPlan(formData)
        : await updateMealPlan(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleDelete(formData: FormData) {
    if (!window.confirm("Supprimer ce repas du calendrier ?")) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteMealPlan(formData);

    if (!result.success) {
      setError(result.error);
      setDeleting(false);
    }
  }

  function handleRecipeChange(nextRecipeId: string) {
    const previousRecipeTitle = recipeTitleById.get(recipeId) ?? "";
    const nextRecipeTitle = recipeTitleById.get(nextRecipeId) ?? "";

    setRecipeId(nextRecipeId);

    if (!title.trim() || title === previousRecipeTitle) {
      setTitle(nextRecipeTitle);
    }
  }

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-5">
        {mealPlanId ? (
          <input type="hidden" name="mealPlanId" value={mealPlanId} />
        ) : null}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="space-y-4">
            {/* Recette liée */}
            <div className="space-y-2">
              <Label htmlFor="recipeId">Recette liée</Label>
              <select
                id="recipeId"
                name="recipeId"
                value={recipeId}
                onChange={(event) => handleRecipeChange(event.target.value)}
                className={selectClassName}
              >
                <option value="">Aucune recette liée</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre affiché</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Chili maison ou Dîner avec les enfants"
              />
            </div>

            {/* Date / Moment / Lieu */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label htmlFor="mealDate" className="text-xs">Date</Label>
                <Input
                  id="mealDate"
                  name="mealDate"
                  type="date"
                  value={mealDate}
                  onChange={(event) => setMealDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mealSlot" className="text-xs">Moment</Label>
                <select
                  id="mealSlot"
                  name="mealSlot"
                  value={mealSlot}
                  onChange={(event) =>
                    setMealSlot(event.target.value as "lunch" | "dinner")
                  }
                  className={selectClassName}
                >
                  <option value="lunch">Midi</option>
                  <option value="dinner">Soir</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="locationId" className="text-xs">Lieu</Label>
                <select
                  id="locationId"
                  name="locationId"
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                  className={selectClassName}
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options secondaires — masquées par défaut en création */}
            {!showMore && (
              <button
                type="button"
                onClick={() => setShowMore(true)}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Options (responsable, notes, statut)
              </button>
            )}

            {showMore && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="responsibleProfileId" className="text-xs">Responsable</Label>
                    <select
                      id="responsibleProfileId"
                      name="responsibleProfileId"
                      value={responsibleProfileId}
                      onChange={(event) => setResponsibleProfileId(event.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Aucun</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs">Statut</Label>
                    <select
                      id="status"
                      name="status"
                      value={status}
                      onChange={(event) =>
                        setStatus(
                          event.target.value as "planned" | "done" | "canceled",
                        )
                      }
                      className={selectClassName}
                    >
                      <option value="planned">Prévu</option>
                      <option value="done">Fait</option>
                      <option value="canceled">Annulé</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs">Notes</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Précisions, contraintes, rappel..."
                    className="min-h-16 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button type="submit" className="w-full sm:w-auto" disabled={loading || deleting}>
            {loading
              ? mode === "create"
                ? "Création..."
                : "Enregistrement..."
              : mode === "create"
                ? "Créer ce repas"
                : "Enregistrer"}
          </Button>
          <Link
            href={returnHref}
            className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center sm:w-auto")}
          >
            Retour au calendrier
          </Link>
        </div>
      </form>

      {mode === "edit" && mealPlanId ? (
        <form action={handleDelete} className="border-t border-border pt-6">
          <input type="hidden" name="mealPlanId" value={mealPlanId} />
          <Button
            type="submit"
            variant="destructive"
            disabled={loading || deleting}
            formAction={handleDelete}
          >
            {deleting ? "Suppression..." : "Supprimer ce repas"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
