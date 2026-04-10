"use client";

import { useEffect, useState } from "react";
import { ManualShoppingItemForm } from "@/components/forms/manual-shopping-item-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface ShoppingAddItemDialogProps {
  locationId: string;
  locationName: string;
  triggerClassName?: string;
  triggerLabel?: string;
  floatingOnMobile?: boolean;
}

export function ShoppingAddItemDialog({
  locationId,
  locationName,
  triggerClassName,
  triggerLabel = "Ajouter un article",
  floatingOnMobile = false,
}: ShoppingAddItemDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)} className={cn(triggerClassName)}>
        {triggerLabel}
      </Button>

      {floatingOnMobile ? (
        <button
          type="button"
          aria-label="Ajouter un article"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:hidden"
        >
          <Plus className="size-6" />
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopping-add-item-title"
            className="max-h-[min(calc(100dvh-2rem),calc(100vh-2rem))] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-3xl border border-border bg-background p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3
                  id="shopping-add-item-title"
                  className="text-lg font-bold"
                >
                  Ajouter un article
                </h3>
                <p className="text-sm text-muted-foreground">
                  Le nouvel article sera ajouté à la liste de{" "}
                  <span className="font-medium text-foreground">
                    {locationName}
                  </span>
                  .
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Fermer
              </Button>
            </div>

            <ManualShoppingItemForm
              locationId={locationId}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
