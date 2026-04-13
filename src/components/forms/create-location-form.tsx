"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createLocation } from "@/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateLocationForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await createLocation(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    formRef.current?.reset();
    setLoading(false);
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="space-y-3"
    >
      <div className="space-y-2">
        <Label htmlFor="location-name" className="sr-only">
          Nom du lieu
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="location-name"
            name="name"
            type="text"
            placeholder="Ex: Maison principale"
            required
          />
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </form>
  );
}
