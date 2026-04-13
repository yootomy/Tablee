"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleShoppingItem } from "@/actions/shopping";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShoppingItemToggleProps {
  itemId: string;
  checked: boolean;
}

export function ShoppingItemToggle({
  itemId,
  checked,
}: ShoppingItemToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // useState instead of useOptimistic: avoids the revert flash caused by
  // useOptimistic resetting to the checked prop when the transition ends
  // before router.refresh() has completed (refresh() returns void, not Promise)
  const [localChecked, setLocalChecked] = useState(checked);

  function handleClick() {
    const nextCompleted = !localChecked;
    setLocalChecked(nextCompleted);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("itemId", itemId);
      formData.set("nextCompleted", nextCompleted ? "true" : "false");

      const result = await toggleShoppingItem(formData);

      if (!result.success) {
        setLocalChecked(!nextCompleted);
        toast.error("Erreur lors de la mise à jour");
        return;
      }

      toast.success(nextCompleted ? "Article complété" : "Article remis dans la liste");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={localChecked}
      disabled={isPending}
      onClick={handleClick}
      className={cn(
        "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 transition-all",
        localChecked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:border-primary/50",
        isPending && "opacity-60",
      )}
    >
      {localChecked ? <Check className="size-3.5" strokeWidth={3} /> : null}
    </button>
  );
}
