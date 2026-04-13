"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
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
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(checked);

  function handleClick() {
    const nextCompleted = !optimisticChecked;

    startTransition(async () => {
      setOptimisticChecked(nextCompleted);

      const formData = new FormData();
      formData.set("itemId", itemId);
      formData.set("nextCompleted", nextCompleted ? "true" : "false");

      await toggleShoppingItem(formData);
      toast.success(nextCompleted ? "Article complété" : "Article remis dans la liste");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimisticChecked}
      disabled={isPending}
      onClick={handleClick}
      className={cn(
        "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 transition-all",
        optimisticChecked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:border-primary/50",
      )}
    >
      {optimisticChecked ? <Check className="size-3.5" strokeWidth={3} /> : null}
    </button>
  );
}
