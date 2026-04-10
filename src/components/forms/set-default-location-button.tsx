"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinned } from "lucide-react";
import { setPreferredLocation } from "@/actions/locations";
import { Button } from "@/components/ui/button";

interface SetDefaultLocationButtonProps {
  locationId: string;
  isDefault: boolean;
}

export function SetDefaultLocationButton({
  locationId,
  isDefault,
}: SetDefaultLocationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetDefault() {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("locationId", locationId);

    const result = await setPreferredLocation(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  if (isDefault) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <MapPinned className="size-3.5" />
        Par défaut
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={handleSetDefault}
        disabled={loading}
      >
        <MapPinned className="size-3.5" />
        {loading ? "Définition..." : "Mettre par défaut"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
