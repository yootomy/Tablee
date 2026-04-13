"use client";

import { useState } from "react";
import { deleteLocation } from "@/actions/locations";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

interface DeleteLocationButtonProps {
  locationId: string;
  locationName: string;
}

export function DeleteLocationButton({
  locationId,
  locationName,
}: DeleteLocationButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteLocation(locationId);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-sm rounded-3xl border border-border bg-background p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Supprimer ce lieu</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Es-tu sûr de vouloir supprimer <strong>{locationName}</strong> ?
                Les articles de courses liés à ce lieu resteront dans ta liste mais ne seront plus associés.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => { setConfirming(false); setError(null); }}
            >
              <X className="size-4" />
            </Button>
          </div>
          {error ? (
            <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setConfirming(false); setError(null); }}
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
