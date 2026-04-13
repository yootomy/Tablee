"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <TriangleAlert className="size-12 text-destructive/60" />
      <h2 className="text-lg font-bold">Une erreur est survenue</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Quelque chose s&apos;est mal passé. Réessaie ou contacte l&apos;administrateur si le problème persiste.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
