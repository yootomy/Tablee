"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteShoppingItem } from "@/actions/shopping";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface DeleteShoppingItemButtonProps {
  itemId: string;
}

export function DeleteShoppingItemButton({
  itemId,
}: DeleteShoppingItemButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);

    const formData = new FormData();
    formData.set("itemId", itemId);

    await deleteShoppingItem(formData);
    toast.success("Article supprimé");
    router.refresh();

    setLoading(false);
    setConfirming(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={loading}
        onClick={() => setConfirming(true)}
        className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
        aria-label="Supprimer cet article"
      >
        <Trash2 className="size-4" />
      </Button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          onClick={() => setConfirming(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl border border-border bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Supprimer l&apos;article</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Es-tu sûr de vouloir supprimer cet article de la liste de courses ?
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
      )}
    </>
  );
}
