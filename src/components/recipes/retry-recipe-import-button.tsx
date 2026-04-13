"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { retryRecipeImport } from "@/actions/recipe-import";
import { Button } from "@/components/ui/button";

export function RetryRecipeImportButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRetry() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("jobId", jobId);

      const result = await retryRecipeImport(formData);

      if (!result.success) {
        window.alert(result.error);
        return;
      }

      router.push(`/recipes/${result.recipeId}`);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={handleRetry}
    >
      {pending ? "Relance..." : "Relancer"}
    </Button>
  );
}

