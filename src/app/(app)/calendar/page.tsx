import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { getPreferredLocationId } from "@/lib/location-preferences";
import {
  addDays,
  formatDateKey,
  getMonthGridDates,
  getWeekStart,
  parseDateOnly,
} from "@/lib/calendar";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { CalendarView } from "@/components/calendar/calendar-view";

type CalendarPageProps = {
  searchParams: Promise<{ week?: string | string[]; locationId?: string | string[] }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { familyId, profileId } = await requireActiveFamily();
  const resolvedSearchParams = await searchParams;
  const rawWeek = Array.isArray(resolvedSearchParams.week)
    ? resolvedSearchParams.week[0]
    : resolvedSearchParams.week;
  const rawLocationId = Array.isArray(resolvedSearchParams.locationId)
    ? resolvedSearchParams.locationId[0]
    : resolvedSearchParams.locationId;

  const today = new Date();
  const referenceDate =
    rawWeek && /^\d{4}-\d{2}-\d{2}$/.test(rawWeek) ? parseDateOnly(rawWeek) : today;
  const weekStart = getWeekStart(referenceDate);

  // Fetch a wider range to cover both week and month views
  const monthGridDates = getMonthGridDates(referenceDate);
  const rangeStart = monthGridDates[0] < weekStart ? monthGridDates[0] : weekStart;
  const rangeEnd = monthGridDates[41] > addDays(weekStart, 6) ? monthGridDates[41] : addDays(weekStart, 6);

  const [locations, meals, members, familyContextPreferences] = await Promise.all([
    prisma.locations.findMany({
      where: {
        family_id: familyId,
        archived_at: null,
      },
      orderBy: { created_at: "asc" },
    }),
    prisma.meal_plans.findMany({
      where: {
        family_id: familyId,
        meal_date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      orderBy: [{ meal_date: "asc" }, { meal_slot: "asc" }, { created_at: "asc" }],
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
    }),
    prisma.family_context_preferences.findUnique({
      where: {
        profile_id_family_id: {
          profile_id: profileId,
          family_id: familyId,
        },
      },
      select: {
        last_selected_location_id: true,
      },
    }),
  ]);

  if (locations.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <AppPageHeader
          eyebrow="Calendrier"
          title="Planning des repas"
          description="Ajoute un lieu de référence pour commencer à organiser la semaine de la famille."
        />
        <EmptyState
          title="Aucun lieu disponible"
          description="Ajoute d'abord un lieu dans la famille pour pouvoir planifier des repas."
          action={
            <Link href="/profile/locations" className={buttonVariants()}>
              Gérer les lieux
            </Link>
          }
        />
      </div>
    );
  }

  const selectedLocationId = locations.some((l) => l.id === rawLocationId)
    ? rawLocationId!
    : "";
  const preferredLocationId = getPreferredLocationId(
    locations,
    familyContextPreferences?.last_selected_location_id,
  );
  const defaultLocationId = selectedLocationId || preferredLocationId || locations[0].id;
  const filteredMeals = selectedLocationId
    ? meals.filter((meal) => meal.location_id === selectedLocationId)
    : meals;

  const locationNameById = Object.fromEntries(
    locations.map((l) => [l.id, l.name]),
  );
  const memberNameByProfileId = Object.fromEntries(
    members.map((m) => [
      m.profile_id,
      m.profiles_family_members_profile_idToprofiles.display_name,
    ]),
  );

  // Serialize meals for the client component
  const serializedMeals = filteredMeals.map((meal) => ({
    id: meal.id,
    title: meal.title,
    meal_date: meal.meal_date,
    meal_slot: meal.meal_slot as "lunch" | "dinner",
    status: meal.status as "planned" | "done" | "canceled",
    location_id: meal.location_id,
    recipe_id: meal.recipe_id,
    responsible_profile_id: meal.responsible_profile_id,
    notes: meal.notes,
  }));

  return (
    <div className="p-4 sm:p-6">
      <CalendarView
        initialWeekStart={formatDateKey(weekStart)}
        meals={serializedMeals}
        locationNameById={locationNameById}
        memberNameByProfileId={memberNameByProfileId}
        selectedLocationId={selectedLocationId}
        defaultLocationId={defaultLocationId}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
      />
    </div>
  );
}
