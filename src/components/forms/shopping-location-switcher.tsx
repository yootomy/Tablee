"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";

interface ShoppingLocationSwitcherProps {
  locations: Array<{
    id: string;
    name: string;
  }>;
  selectedLocationId: string;
}

export function ShoppingLocationSwitcher({
  locations,
  selectedLocationId,
}: ShoppingLocationSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(selectedLocationId);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(selectedLocationId);
  }, [selectedLocationId]);

  function handleChange(nextValue: string) {
    setValue(nextValue);

    const params = new URLSearchParams(searchParams.toString());
    params.set("locationId", nextValue);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-sm text-white/75">
        <MapPin className="size-4 shrink-0" />
        <span>Lieu actif</span>
      </div>
      <div className="relative">
        <select
          name="locationId"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          aria-label="Choisir le lieu actif"
          className="h-11 min-w-0 rounded-full border border-white/20 bg-white/95 px-4 pr-10 text-base text-foreground outline-none transition-colors focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/25 sm:min-w-[13rem] md:h-9 md:text-sm"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        {isPending ? (
          <span className="pointer-events-none absolute right-4 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary/35" />
        ) : null}
      </div>
    </div>
  );
}
