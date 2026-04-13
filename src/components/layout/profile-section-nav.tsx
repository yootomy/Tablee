"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/profile", label: "Membres", exact: true },
  { href: "/profile/locations", label: "Lieux" },
  { href: "/profile/billing", label: "Abonnement" },
];

export function ProfileSectionNav({ inverse = false }: { inverse?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => {
        const isActive = link.exact
          ? pathname === "/tablee/profile" || pathname === "/profile"
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full border px-4 py-2.5 text-sm font-medium transition-all md:px-3.5 md:py-1.5",
              inverse
                ? isActive
                  ? "border-white/20 bg-white text-primary shadow-sm"
                  : "border-white/15 bg-white/10 text-white/85 hover:border-white/25 hover:bg-white/20 hover:text-white"
                : isActive
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
