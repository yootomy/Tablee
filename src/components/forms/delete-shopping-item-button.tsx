"use client";

import { useState } from "react";
import { deleteShoppingItem } from "@/actions/shopping";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteShoppingItemButtonProps {
  itemId: string;
}

export function DeleteShoppingItemButton({
  itemId,
}: DeleteShoppingItemButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    if (!window.confirm("Supprimer cet article de la liste ?")) {
      return;
    }

    setLoading(true);
    const result = await deleteShoppingItem(formData);

    if (!result.success) {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="itemId" value={itemId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={loading}
        className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
        aria-label="Supprimer cet article"
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}
