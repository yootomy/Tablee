"use client";

import { useRef, useState } from "react";
import { createLocation } from "@/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateLocationForm() {
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
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="location-name">Nom du lieu</Label>
        <Input
          id="location-name"
          name="name"
          type="text"
          placeholder="Ex: Maison principale"
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Ajout..." : "Ajouter un lieu"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive sm:basis-full">{error}</p>
      ) : null}
    </form>
  );
}
