"use client";

import { useState } from "react";
import { updateLocation } from "@/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditLocationFormProps {
  locationId: string;
  initialName: string;
}

export function EditLocationForm({
  locationId,
  initialName,
}: EditLocationFormProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSaved(false);

    const result = await updateLocation(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSaved(true);
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      <input type="hidden" name="locationId" value={locationId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          required
        />
        <Button type="submit" variant="outline" disabled={loading}>
          {loading ? "Enregistrement..." : "Renommer"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-muted-foreground">Nom enregistré.</p>
      ) : null}
    </form>
  );
}
