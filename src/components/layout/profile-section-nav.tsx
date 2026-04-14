"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const familyLinks = [
  { href: "/profile/membres", label: "Membres", exact: true },
  { href: "/profile/locations", label: "Lieux" },
  { href: "/profile/billing", label: "Abonnement" },
];

const accountLinks = [{ href: "/profile/compte", label: "Mon compte", exact: false }];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) {
    // Reconnaître /profile et /tablee/profile comme équivalents à /profile/membres
    if (href === "/profile/membres") {
      return (
        pathname === "/profile/membres" ||
        pathname === "/tablee/profile/membres" ||
        pathname === "/profile" ||
        pathname === "/tablee/profile"
      );
    }
    return pathname === href || pathname === `/tablee${href}`;
  }
  return pathname.startsWith(href) || pathname.startsWith(`/tablee${href}`);
}

export function ProfileSectionNav({ inverse = false }: { inverse?: boolean }) {
  const pathname = usePathname();

  const pillClass = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
      inverse
        ? active
          ? "border-white/20 bg-white text-primary shadow-sm"
          : "border-white/15 bg-white/10 text-white/85 hover:border-white/25 hover:bg-white/20 hover:text-white"
        : active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-primary/10 bg-primary/5 text-foreground/70 hover:border-primary/30 hover:bg-accent hover:text-foreground",
    );

  const labelClass = cn(
    "mb-1 text-[10px] font-semibold uppercase tracking-wider",
    inverse ? "text-white/45" : "text-muted-foreground",
  );

  return (
    <nav className="flex flex-wrap items-end gap-x-3 gap-y-3">
      {/* Groupe Ma famille */}
      <div>
        <p className={labelClass}>Ma famille</p>
        <div className="flex flex-wrap gap-2">
          {familyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pillClass(isActive(pathname, link.href, link.exact ?? false))}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Séparateur vertical — desktop uniquement */}
      <div
        className={cn(
          "hidden h-8 w-px self-center sm:block",
          inverse ? "bg-white/20" : "bg-border",
        )}
        aria-hidden
      />

      {/* Groupe Mon compte */}
      <div>
        <p className={labelClass}>Mon compte</p>
        <div className="flex flex-wrap gap-2">
          {accountLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pillClass(isActive(pathname, link.href, link.exact ?? false))}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
