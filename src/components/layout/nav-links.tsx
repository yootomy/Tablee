"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ChefHat,
  ShoppingCart,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/calendar", label: "Repas", icon: CalendarDays },
  { href: "/recipes", label: "Recettes", icon: ChefHat },
  { href: "/shopping", label: "Courses", icon: ShoppingCart },
];

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-foreground/70 hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="size-5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-medium transition-colors ${
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <div className={`rounded-full p-1 ${isActive ? "bg-primary/10" : ""}`}>
              <Icon className="size-5" />
            </div>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
