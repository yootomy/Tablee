"use client";

import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

interface UserMenuProps {
  name: string;
  compact?: boolean;
}

export function UserMenu({ name, compact = false }: UserMenuProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex shrink-0 items-center rounded-xl hover:bg-accent ${
          compact ? "gap-0 p-1" : "gap-2 p-1"
        }`}
      >
        <Avatar className="size-8 border-2 border-primary/20">
          <AvatarFallback className="bg-primary text-[11px] font-bold text-white">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-semibold md:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/tablee/login" })}>
          <LogOut className="size-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
