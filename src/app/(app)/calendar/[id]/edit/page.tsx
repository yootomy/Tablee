import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import {
  formatDateInputValue,
  getMealWeekHref,
} from "@/lib/calendar";
import { AddIngredientsToShoppingForm } from "@/components/forms/add-ingredients-to-shopping-form";
import { MealPlanForm } from "@/components/forms/meal-plan-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { CalendarDays } from "lucide-react";

type EditMealPlanPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMealPlanPage({
  params,
}: EditMealPlanPageProps) {
  const { familyId } = await requireActiveFamily();
  const { id } = await params;

  const [mealPlan, locations, recipes, members] = await Promise.all([
    prisma.meal_plans.findFirst({
      where: {
        id,
        family_id: familyId,
      },
    }),
    prisma.locations.findMany({
      where: {
        family_id: familyId,
        archived_at: null,
      },
      orderBy: { name: "asc" },
    }),
    prisma.recipes.findMany({
      where: {
        family_id: familyId,
        archived_at: null,
      },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
      },
    }),
    prisma.family_members.findMany({
      where: {
        family_id: familyId,
      },
      include: {
        profiles_family_members_profile_idToprofiles: {
          select: {
            display_name: true,
          },
        },
      },
      orderBy: {
        joined_at: "asc",
      },
    }),
  ]);

  if (!mealPlan) {
    notFound();
  }

  const returnHref = getMealWeekHref(mealPlan.meal_date, mealPlan.location_id);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Repas"
        title={mealPlan.title}
        description="Mets à jour le contexte du repas, sans perdre le lien avec la recette ou la liste de courses."
        badges={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
            <CalendarDays className="size-3.5" />
            Édition
          </span>
        }
      />

      <MealPlanForm
        mode="edit"
        mealPlanId={mealPlan.id}
        initialValues={{
          mealDate: formatDateInputValue(mealPlan.meal_date),
          mealSlot: mealPlan.meal_slot,
          locationId: mealPlan.location_id,
          recipeId: mealPlan.recipe_id ?? "",
          responsibleProfileId: mealPlan.responsible_profile_id ?? "",
          title: mealPlan.title,
          notes: mealPlan.notes ?? "",
          status: mealPlan.status,
        }}
        recipes={recipes.map((recipe) => ({
          id: recipe.id,
          label: recipe.title,
        }))}
        locations={locations.map((location) => ({
          id: location.id,
          label: location.name,
        }))}
        members={members.map((member) => ({
          id: member.profile_id,
          label: member.profiles_family_members_profile_idToprofiles.display_name,
        }))}
        returnHref={returnHref}
      />

      {/* Envoyer aux courses — section compacte */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-sm font-bold">Envoyer aux courses</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Utilise la recette liée pour remplir directement une liste de courses.
        </p>
        <div className="mt-3">
          {mealPlan.recipe_id ? (
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
          ) : (
            <p className="rounded-xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Lie d&apos;abord une recette à ce repas pour pouvoir envoyer ses ingrédients aux courses.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
