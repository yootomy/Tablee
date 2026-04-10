import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import {
  formatDateInputValue,
  getMealWeekHref,
  parseDateOnly,
} from "@/lib/calendar";
import { MealPlanForm } from "@/components/forms/meal-plan-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

type NewMealPlanPageProps = {
  searchParams: Promise<{
    date?: string | string[];
    slot?: string | string[];
    locationId?: string | string[];
  }>;
};

export default async function NewMealPlanPage({
  searchParams,
}: NewMealPlanPageProps) {
  const { familyId } = await requireActiveFamily();
  const resolvedSearchParams = await searchParams;
  const rawDate = Array.isArray(resolvedSearchParams.date)
    ? resolvedSearchParams.date[0]
    : resolvedSearchParams.date;
  const rawSlot = Array.isArray(resolvedSearchParams.slot)
    ? resolvedSearchParams.slot[0]
    : resolvedSearchParams.slot;
  const rawLocationId = Array.isArray(resolvedSearchParams.locationId)
    ? resolvedSearchParams.locationId[0]
    : resolvedSearchParams.locationId;

  const [locations, recipes, members] = await Promise.all([
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

  if (locations.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <AppPageHeader
          eyebrow="Repas"
          title="Planifier un repas"
          description="Ajoute d’abord un lieu de référence pour pouvoir organiser les repas de la famille."
        />
        <EmptyState
          icon={<MapPin className="size-10 text-muted-foreground/40" />}
          title="Impossible de planifier un repas"
          description="Ajoute d'abord un lieu à la famille active pour continuer."
          action={
            <Link href="/family/locations" className={buttonVariants()}>
              Gérer les lieux
            </Link>
          }
        />
      </div>
    );
  }

  const date =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? parseDateOnly(rawDate)
      : new Date();
  const slot = rawSlot === "dinner" ? "dinner" : "lunch";
  const locationId = locations.some((location) => location.id === rawLocationId)
    ? rawLocationId!
    : locations[0].id;
  const returnHref = getMealWeekHref(date, locationId);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Repas"
        title="Planifier un repas"
        description="Pose la base du repas en quelques champs seulement, puis ajoute des précisions uniquement si nécessaire."
        badges={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
            <CalendarDays className="size-3.5" />
            Création rapide
          </span>
        }
      />

      <MealPlanForm
        mode="create"
        initialValues={{
          mealDate: formatDateInputValue(date),
          mealSlot: slot,
          locationId,
          recipeId: "",
          responsibleProfileId: "",
          title: "",
          notes: "",
          status: "planned",
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
    </div>
  );
}
