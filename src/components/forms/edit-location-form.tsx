"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLocation } from "@/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PencilLine, Check, X } from "lucide-react";

interface EditLocationFormProps {
  locationId: string;
  initialName: string;
}

export function EditLocationForm({
  locationId,
  initialName,
}: EditLocationFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await updateLocation(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  function handleCancel() {
    setName(initialName);
    setError(null);
    setEditing(false);
  }

  return (
    <div className="space-y-2">
      {!editing ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setName(initialName);
            setError(null);
            setEditing(true);
          }}
        >
          <PencilLine className="size-3.5" />
          Renommer
        </Button>
      ) : (
        <form action={handleSubmit} className="space-y-2">
          <input type="hidden" name="locationId" value={locationId} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="gap-1.5">
                <Check className="size-3.5" />
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
