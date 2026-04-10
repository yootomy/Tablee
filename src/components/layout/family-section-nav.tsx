"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/family/members", label: "Membres" },
  { href: "/family/locations", label: "Lieux" },
];

export function FamilySectionNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full border px-4 py-2.5 text-sm font-medium transition-all md:px-3.5 md:py-1.5",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-primary/10 bg-primary/5 text-foreground/70 hover:border-primary/30 hover:bg-accent hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
