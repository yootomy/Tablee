"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Clock, Users, Plus, LayoutGrid, List, ChefHat } from "lucide-react";
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
  const [view, setView] = useState<"list" | "grid">("list");

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "grid" || saved === "list") {
      setView(saved);
    }
  }, []);

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
    <ul className="divide-y">
      {recipes.map((recipe) => {
        const total =
          recipe.prep_time_minutes || recipe.cook_time_minutes
            ? formatMinutes(
                (recipe.prep_time_minutes ?? 0) +
                  (recipe.cook_time_minutes ?? 0),
              )
            : null;

        return (
          <li key={recipe.id}>
            <Link
              href={`/recipes/${recipe.id}`}
              className="group flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium group-hover:text-primary">
                  {recipe.title}
                </p>
                {recipe.description?.trim() ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {recipe.description}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {recipe.servings ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    {recipe.servings}
                  </span>
                ) : null}
                {total ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {total}
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function GridView({ recipes }: { recipes: RecipeItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {recipes.map((recipe) => {
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
            className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl border border-border transition-shadow hover:shadow-md"
          >
            {/* Image or placeholder */}
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/20">
                <ChefHat className="absolute left-1/2 top-1/3 size-10 -translate-x-1/2 -translate-y-1/2 text-primary/20" />
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Text content */}
            <div className="relative z-10 p-2.5 sm:p-3">
              <p className="line-clamp-2 text-xs font-semibold leading-tight text-white sm:text-sm">
                {recipe.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                {recipe.servings ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-white/75 sm:text-xs">
                    <Users className="size-2.5 sm:size-3" />
                    {recipe.servings}
                  </span>
                ) : null}
                {total ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-white/75 sm:text-xs">
                    <Clock className="size-2.5 sm:size-3" />
                    {total}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
