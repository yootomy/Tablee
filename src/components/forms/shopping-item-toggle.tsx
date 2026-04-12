"use client";

import { useRef, useState } from "react";
import { toggleShoppingItem } from "@/actions/shopping";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShoppingItemToggleProps {
  itemId: string;
  checked: boolean;
}

export function ShoppingItemToggle({
  itemId,
  checked,
}: ShoppingItemToggleProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isChecked, setIsChecked] = useState(checked);

  async function handleSubmit(formData: FormData) {
    const result = await toggleShoppingItem(formData);

    if (!result.success) {
      setIsChecked((current) => !current);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <input type="hidden" name="itemId" value={itemId} />
      <input
        type="hidden"
        name="nextCompleted"
        value={isChecked ? "true" : "false"}
      />
      <button
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        aria-label={isChecked ? "Marquer comme non acheté" : "Marquer comme acheté"}
        onClick={() => {
          const next = !isChecked;
          const form = formRef.current;
          const field = form?.elements.namedItem(
            "nextCompleted",
          ) as HTMLInputElement | null;
          if (field) field.value = next ? "true" : "false";
          setIsChecked(next);
          formRef.current?.requestSubmit();
        }}
        className={cn(
          "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 transition-all",
          isChecked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background hover:border-primary/50",
        )}
      >
        {isChecked ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </button>
    </form>
  );
}
