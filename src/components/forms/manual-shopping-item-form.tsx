"use client";

import { useRef, useState } from "react";
import { addManualShoppingItem } from "@/actions/shopping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ManualShoppingItemFormProps {
  locationId: string;
  onSuccess?: () => void;
}

export function ManualShoppingItemForm({
  locationId,
  onSuccess,
}: ManualShoppingItemFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await addManualShoppingItem(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    formRef.current?.reset();
    toast.success("Article ajouté");
    setLoading(false);
    onSuccess?.();
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="space-y-4"
    >
      <input type="hidden" name="locationId" value={locationId} />

      <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-[minmax(0,1.6fr)_120px_120px_minmax(0,1.4fr)]">
        <div className="col-span-2 space-y-2 lg:col-span-1">
          <Label htmlFor="shopping-name">Article</Label>
          <Input
            id="shopping-name"
            name="name"
            placeholder="Ex: lait demi-écrémé"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shopping-quantity">Quantité</Label>
          <Input
            id="shopping-quantity"
            name="quantity"
            placeholder="2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shopping-unit">Unité</Label>
          <Input
            id="shopping-unit"
            name="unit"
            placeholder="L, g, boîte"
          />
        </div>
        <div className="col-span-2 space-y-2 lg:col-span-1">
          <Label htmlFor="shopping-comment">Commentaire</Label>
          <Input
            id="shopping-comment"
            name="comment"
            placeholder="bio, promo, marque..."
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Ajout..." : "Ajouter à la liste"}
      </Button>
    </form>
  );
}
