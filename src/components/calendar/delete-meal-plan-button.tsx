"use client";

import { useState } from "react";
import { deleteMealPlan } from "@/actions/meal-plans";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

interface DeleteMealPlanButtonProps {
  mealPlanId: string;
  mealPlanTitle: string;
}

export function DeleteMealPlanButton({
  mealPlanId,
  mealPlanTitle,
}: DeleteMealPlanButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await deleteMealPlan(mealPlanId);
  }

  if (confirming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-sm rounded-3xl border border-border bg-background p-5 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Supprimer le repas</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Es-tu sur de vouloir supprimer <strong>{mealPlanTitle}</strong>{" "}
                du calendrier ? Cette action est irréversible.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setConfirming(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-3.5" />
      Supprimer
    </Button>
  );
}
