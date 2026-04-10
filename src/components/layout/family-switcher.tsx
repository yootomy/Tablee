"use client";

import { switchFamily } from "@/actions/families";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";

interface Family {
  id: string;
  name: string;
  role: string;
}

interface FamilySwitcherProps {
  families: Family[];
  activeFamilyId: string | null;
  triggerClassName?: string;
  fullWidth?: boolean;
}

export function FamilySwitcher({
  families,
  activeFamilyId,
  triggerClassName,
  fullWidth = true,
}: FamilySwitcherProps) {
  const activeFamily = families.find((f) => f.id === activeFamilyId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          fullWidth
            ? "w-full min-w-0 justify-start truncate"
            : "w-auto max-w-[8.75rem] shrink-0 justify-start truncate",
          triggerClassName,
        )}
      >
        {activeFamily?.name ?? "Choisir une famille"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mes familles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {families.map((family) => (
            <DropdownMenuItem
              key={family.id}
              onClick={() => switchFamily(family.id)}
              className={family.id === activeFamilyId ? "font-semibold" : ""}
            >
              {family.name}
              {family.id === activeFamilyId && (
                <span className="ml-auto text-xs text-muted-foreground">
                  actif
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
