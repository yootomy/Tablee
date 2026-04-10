import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { getMealWeekHref } from "@/lib/calendar";
import { AddIngredientsToShoppingForm } from "@/components/forms/add-ingredients-to-shopping-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MealDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

function formatMealSlot(slot: "lunch" | "dinner") {
  return slot === "lunch" ? "Midi" : "Soir";
}

function formatMealStatus(status: "planned" | "done" | "canceled") {
  switch (status) {
    case "done":
      return "Fait";
    case "canceled":
      return "Annulé";
    default:
      return "Prévu";
  }
}

export default async function MealDetailPage({ params }: MealDetailPageProps) {
  const { familyId } = await requireActiveFamily();
  const { id } = await params;

  const mealPlan = await prisma.meal_plans.findFirst({
    where: {
      id,
      family_id: familyId,
    },
    include: {
      locations: {
        select: {
          name: true,
        },
      },
      recipes: {
        select: {
          id: true,
          title: true,
          description: true,
          prep_time_minutes: true,
          cook_time_minutes: true,
          servings: true,
        },
      },
      family_members_meal_plans_family_id_responsible_profile_idTofamily_members: {
        include: {
          profiles_family_members_profile_idToprofiles: {
            select: {
              display_name: true,
            },
          },
        },
      },
    },
  });

  if (!mealPlan) {
    notFound();
  }

  const returnHref = getMealWeekHref(mealPlan.meal_date, mealPlan.location_id);
  const recipe = mealPlan.recipes;
  const totalRecipeTime = recipe
    ? (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)
    : 0;
  const responsible =
    mealPlan.family_members_meal_plans_family_id_responsible_profile_idTofamily_members
      ?.profiles_family_members_profile_idToprofiles.display_name ?? null;

  const locations = await prisma.locations.findMany({
    where: {
      family_id: familyId,
      archived_at: null,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Repas"
        title={mealPlan.title}
        description={`${mealPlan.locations?.name ?? "Lieu non défini"} • ${formatMealSlot(
          mealPlan.meal_slot,
        )} • ${formatMealStatus(mealPlan.status)}`}
        badges={
          <>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
              {new Date(mealPlan.meal_date).toLocaleDateString("fr-CH", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            {responsible ? (
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
                {responsible}
              </span>
            ) : null}
          </>
        }
        action={
          <>
            <Link
              href={`/calendar/${mealPlan.id}/edit`}
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className: "border-white/20 bg-white/95 text-foreground hover:bg-white",
              })}
            >
              Modifier
            </Link>
            <Link
              href={returnHref}
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className: "border-white/20 bg-white/95 text-foreground hover:bg-white",
              })}
            >
              Retour au calendrier
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Repères</CardTitle>
              <CardDescription>
                Un résumé rapide du repas planifié et de son contexte.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Date</p>
                <p className="mt-1 font-medium">
                  {new Date(mealPlan.meal_date).toLocaleDateString("fr-CH", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Moment</p>
                <p className="mt-1 font-medium">{formatMealSlot(mealPlan.meal_slot)}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Lieu</p>
                <p className="mt-1 font-medium">{mealPlan.locations?.name ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Responsable</p>
                <p className="mt-1 font-medium">{responsible ?? "Non défini"}</p>
              </div>
            </CardContent>
          </Card>

          {mealPlan.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6">{mealPlan.notes}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recette liée</CardTitle>
              <CardDescription>
                Ouvre la fiche recette pour voir le détail complet de préparation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recipe ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 to-accent/60 p-5">
                    <p className="text-lg font-bold">{recipe.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {recipe.description?.trim() || "Aucune description pour cette recette."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {recipe.servings ? (
                        <span className="rounded-full bg-background/80 px-2.5 py-1">
                          {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {totalRecipeTime ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                          Total {formatDuration(totalRecipeTime)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <Link
                    href={`/recipes/${recipe.id}`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Voir la recette
                  </Link>
                </div>
              ) : (
                <p className="rounded-xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Ce repas n&apos;est lié à aucune recette pour l&apos;instant.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {recipe && locations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Envoyer aux courses</CardTitle>
                <CardDescription>
                  Ajoute directement les ingrédients de la recette liée à la liste du lieu de ton choix.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AddIngredientsToShoppingForm
                  source="meal"
                  sourceId={mealPlan.id}
                  defaultLocationId={mealPlan.location_id}
                  locations={locations.map((location) => ({
                    id: location.id,
                    label: location.name,
                  }))}
                  buttonLabel="Ajouter les ingrédients de ce repas"
                  description="Le lieu du repas est préselectionné, mais tu peux le changer avant confirmation."
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
