"use client";

import { useState } from "react";
import { deleteShoppingItem } from "@/actions/shopping";
import { Button } from "@/components/ui/button";

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
      <Button type="submit" variant="ghost" size="sm" disabled={loading}>
        {loading ? "Suppression..." : "Supprimer"}
      </Button>
    </form>
  );
}
