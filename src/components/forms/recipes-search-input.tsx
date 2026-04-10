"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface RecipesSearchInputProps {
  initialValue: string;
}

export function RecipesSearchInput({
  initialValue,
}: RecipesSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const deferredValue = useDeferredValue(value);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const normalizedValue = deferredValue.trim();
    const currentValue = (searchParams.get("q") ?? "").trim();

    if (normalizedValue === currentValue) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (normalizedValue) {
      params.set("q", normalizedValue);
    } else {
      params.delete("q");
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [deferredValue, pathname, router, searchParams]);

  return (
    <div className="relative max-w-xl">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-foreground/45" />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Rechercher une recette..."
        aria-label="Rechercher une recette"
        className="h-11 rounded-full border-white/20 bg-white/95 pl-11 pr-10 text-base text-foreground shadow-sm placeholder:text-foreground/45 md:text-sm"
      />
      {isPending ? (
        <span className="pointer-events-none absolute right-4 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary/35" />
      ) : null}
    </div>
  );
}
