"use client";

import { useRef, useState } from "react";
import { toggleShoppingItem } from "@/actions/shopping";

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
      <label className="flex cursor-pointer items-center p-2 -m-2">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(event) => {
            const form = formRef.current;
            const nextCompletedField = form?.elements.namedItem(
              "nextCompleted",
            ) as HTMLInputElement | null;
            if (nextCompletedField) {
              nextCompletedField.value = event.target.checked ? "true" : "false";
            }
            setIsChecked(event.target.checked);
            formRef.current?.requestSubmit();
          }}
          className="size-5 rounded border-input accent-primary"
        />
      </label>
    </form>
  );
}
