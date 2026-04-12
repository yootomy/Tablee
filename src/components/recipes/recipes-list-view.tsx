"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Clock, Users, Plus, LayoutGrid, List, ChefHat } from "lucide-react";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type RecipeItem = {
  id: string;
  title: string;
  description: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
};

interface RecipesListViewProps {
  recipes: RecipeItem[];
}

function formatMinutes(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h${rem}` : `${hours}h`;
}

const VIEW_KEY = "tablee-recipes-view";

export function RecipesListView({ recipes }: RecipesListViewProps) {
  const [view, setView] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") {
      return "list";
    }

    const saved = window.localStorage.getItem(VIEW_KEY);
    return saved === "grid" || saved === "list" ? saved : "list";
  });

  function toggleView(next: "list" | "grid") {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">
            Toutes les recettes
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({recipes.length})
            </span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => toggleView("list")}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  view === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Vue liste"
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleView("grid")}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  view === "grid"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Vue grille"
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>
            <Link
              href="/recipes/new"
              className={buttonVariants({
                size: "sm",
                className: "hidden md:inline-flex",
              })}
            >
              <Plus className="size-3.5" />
              Ajouter
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {view === "list" ? (
          <ListView recipes={recipes} />
        ) : (
          <GridView recipes={recipes} />
        )}
      </CardContent>
    </Card>
  );
}

function ListView({ recipes }: { recipes: RecipeItem[] }) {
  return (
    <div className="space-y-3">
      {recipes.map((recipe) => {
        const imageUrl = resolveMediaUrl(recipe.image_url);
        const total =
          recipe.prep_time_minutes || recipe.cook_time_minutes
            ? formatMinutes(
                (recipe.prep_time_minutes ?? 0) +
                  (recipe.cook_time_minutes ?? 0),
              )
            : null;

        return (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="group flex items-start gap-3 rounded-xl border border-border p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/30 sm:p-4"
          >
            <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-primary/10 sm:h-16 sm:w-24">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={recipe.title}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <ChefHat className="size-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium leading-snug group-hover:text-primary sm:text-sm">
                {recipe.title}
              </p>
              {recipe.description?.trim() ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {recipe.description}
                </p>
              ) : null}
              {(recipe.servings || total) ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {recipe.servings ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      <Users className="size-3" />
                      {recipe.servings} p.
                    </span>
                  ) : null}
                  {total ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      <Clock className="size-3" />
                      {total}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function GridView({ recipes }: { recipes: RecipeItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {recipes.map((recipe) => {
        const imageUrl = resolveMediaUrl(recipe.image_url);
        const total =
          recipe.prep_time_minutes || recipe.cook_time_minutes
            ? formatMinutes(
                (recipe.prep_time_minutes ?? 0) +
                  (recipe.cook_time_minutes ?? 0),
              )
            : null;

        return (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-2xl border border-border transition-all hover:border-primary/40 hover:shadow-lg"
          >
            {/* Image or placeholder */}
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={recipe.title}
                className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/40 to-primary/10">
                <ChefHat className="absolute left-1/2 top-1/3 size-12 -translate-x-1/2 -translate-y-1/2 text-primary/15 transition-transform duration-300 group-hover:scale-110" />
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

            {/* Text content */}
            <div className="relative z-10 space-y-1.5 p-3 sm:p-3.5">
              <p className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base">
                {recipe.title}
              </p>
              {recipe.description?.trim() ? (
                <p className="line-clamp-1 text-[11px] text-white/60 sm:text-xs">
                  {recipe.description}
                </p>
              ) : null}
              {(recipe.servings || total) ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {recipe.servings ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm sm:text-xs">
                      <Users className="size-3" />
                      {recipe.servings} p.
                    </span>
                  ) : null}
                  {total ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm sm:text-xs">
                      <Clock className="size-3" />
                      {total}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
