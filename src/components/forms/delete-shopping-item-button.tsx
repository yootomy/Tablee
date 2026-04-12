"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteShoppingItem } from "@/actions/shopping";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteShoppingItemButtonProps {
  itemId: string;
}

export function DeleteShoppingItemButton({
  itemId,
}: DeleteShoppingItemButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Supprimer cet article de la liste ?")) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("itemId", itemId);

      await deleteShoppingItem(formData);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      onClick={handleClick}
      className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
      aria-label="Supprimer cet article"
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
