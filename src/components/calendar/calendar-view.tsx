"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/layout/page-hero";
import { buttonVariants } from "@/components/ui/button";
import {
  addDays,
  addMonths,
  formatDateKey,
  formatDayNumber,
  formatMonthYear,
  formatShortDay,
  getMonthGridDates,
  getWeekDates,
  getWeekStart,
  isSameDay,
  isSameMonth,
  parseDateOnly,
} from "@/lib/calendar";

type MealSlot = "lunch" | "dinner";

type MealData = {
  id: string;
  title: string;
  meal_date: Date;
  meal_slot: MealSlot;
  status: "planned" | "done" | "canceled";
  location_id: string;
  recipe_id: string | null;
  responsible_profile_id: string | null;
  notes: string | null;
};

type CalendarViewProps = {
  initialWeekStart: string;
  meals: MealData[];
  locationNameById: Record<string, string>;
  memberNameByProfileId: Record<string, string>;
  selectedLocationId: string;
  defaultLocationId: string;
  locations: { id: string; name: string }[];
};

function getSlotLabel(slot: MealSlot) {
  return slot === "lunch" ? "MIDI" : "SOIR";
}

function getStatusBadge(status: "planned" | "done" | "canceled") {
  switch (status) {
    case "done":
      return { label: "Fait", className: "bg-primary text-primary-foreground" };
    case "canceled":
      return { label: "Annulé", className: "bg-destructive/10 text-destructive" };
    default:
      return { label: "Prévu", className: "bg-accent text-foreground" };
  }
}

export function CalendarView({
  initialWeekStart,
  meals,
  locationNameById,
  memberNameByProfileId,
  selectedLocationId,
  defaultLocationId,
  locations,
}: CalendarViewProps) {
  const router = useRouter();
  const [view, setView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(() => parseDateOnly(initialWeekStart));
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const today = new Date();
  const weekStart = getWeekStart(currentDate);
  const weekDates = getWeekDates(weekStart);
  const monthGridDates = getMonthGridDates(currentDate);

  const mealsBySlotKey = new Map<string, MealData[]>();
  for (const meal of meals) {
    const key = `${formatDateKey(meal.meal_date)}:${meal.meal_slot}`;
    const existing = mealsBySlotKey.get(key);
    if (existing) {
      existing.push(meal);
    } else {
      mealsBySlotKey.set(key, [meal]);
    }
  }

  const mealsByDateKey = new Map<string, MealData[]>();
  for (const meal of meals) {
    const key = formatDateKey(meal.meal_date);
    const existing = mealsByDateKey.get(key);
    if (existing) {
      existing.push(meal);
    } else {
      mealsByDateKey.set(key, [meal]);
    }
  }

  function navigateWeek(direction: number) {
    setCurrentDate((date) => addDays(date, direction * 7));
  }

  function navigateMonth(direction: number) {
    setCurrentDate((date) => addMonths(date, direction));
  }

  function goToToday() {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  }

  const currentPeriodLabel =
    view === "week"
      ? `${weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} – ${weekDates[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
      : formatMonthYear(currentDate);
  const currentLocationLabel = selectedLocationId
    ? locationNameById[selectedLocationId]
    : "Tous les lieux";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Calendrier"
        title={currentPeriodLabel}
        description="Visualise les repas de la famille, puis planifie ou ajuste la semaine sans quitter le contexte."
        meta={`${view === "week" ? "Vue semaine" : "Vue mois"} • ${currentLocationLabel}`}
      />

      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => (view === "week" ? navigateWeek(-1) : navigateMonth(-1))}
              className={buttonVariants({ variant: "outline", size: "icon-sm" })}
            >
              ‹
            </button>
            <button
              onClick={() => (view === "week" ? navigateWeek(1) : navigateMonth(1))}
              className={buttonVariants({ variant: "outline", size: "icon-sm" })}
            >
              ›
            </button>
            <button onClick={goToToday} className={buttonVariants({ size: "sm" })}>
              Aujourd&apos;hui
            </button>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            {locations.length > 1 && (
              <select
                value={selectedLocationId}
                onChange={(event) => {
                  const params = new URLSearchParams(window.location.search);
                  if (event.target.value) {
                    params.set("locationId", event.target.value);
                  } else {
                    params.delete("locationId");
                  }
                  params.set("week", formatDateKey(weekStart));
                  router.push(`/calendar?${params.toString()}`);
                }}
                className="h-10 w-full rounded-full border border-border bg-background px-4 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 sm:w-auto sm:min-w-[11rem] md:h-9 md:text-sm"
              >
                <option value="">Tous les lieux</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex self-start rounded-full bg-muted p-0.5">
              <button
                onClick={() => setView("week")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors md:px-4 md:py-1.5 ${
                  view === "week"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setView("month")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors md:px-4 md:py-1.5 ${
                  view === "month"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mois
              </button>
            </div>
          </div>
        </div>
      </div>

      {view === "week" && (
        <>
          <div className="hidden gap-3 xl:grid xl:grid-cols-7">
            {weekDates.map((date) => {
              const dateKey = formatDateKey(date);
              const isToday = isSameDay(date, today);

              return (
                <div key={dateKey} className="min-h-[200px]">
                  <div
                    className={`mb-2 rounded-xl px-3 py-2 text-center ${
                      isToday ? "bg-accent" : ""
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {formatShortDay(date)}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        isToday ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {formatDayNumber(date)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {(["lunch", "dinner"] as const).map((slot) => {
                      const slotMeals = mealsBySlotKey.get(`${dateKey}:${slot}`) ?? [];
                      const addHref = `/calendar/new?date=${dateKey}&slot=${slot}&locationId=${encodeURIComponent(defaultLocationId)}`;

                      if (slotMeals.length === 0) {
                        return (
                          <Link
                            key={slot}
                            href={addHref}
                            className="group flex flex-col items-center rounded-xl border border-dashed border-border p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/50"
                          >
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                              {getSlotLabel(slot)}
                            </span>
                            <span className="mt-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                              + Ajouter
                            </span>
                          </Link>
                        );
                      }

                      return slotMeals.map((meal) => (
                        <Link
                          key={meal.id}
                          href={`/calendar/${meal.id}`}
                          className="block rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
                        >
                          <p className="text-[10px] font-semibold uppercase text-primary">
                            {getSlotLabel(meal.meal_slot)}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-foreground">
                            {meal.title}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {meal.location_id && locationNameById[meal.location_id] ? (
                              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-foreground">
                                {locationNameById[meal.location_id]}
                              </span>
                            ) : null}
                            {meal.responsible_profile_id &&
                            memberNameByProfileId[meal.responsible_profile_id] ? (
                              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {memberNameByProfileId[meal.responsible_profile_id]}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      ));
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="xl:hidden">
            <div className="mb-4 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 snap-x snap-mandatory">
              {weekDates.map((date) => {
                const isSelected = isSameDay(date, selectedDay);
                const isToday = isSameDay(date, today);

                return (
                  <button
                    key={formatDateKey(date)}
                    onClick={() => setSelectedDay(date)}
                    className={`flex min-w-[3rem] shrink-0 snap-start flex-col items-center rounded-xl px-3 py-2.5 transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isToday
                          ? "bg-accent text-primary"
                          : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase">
                      {formatShortDay(date)}
                    </span>
                    <span className="text-base font-bold">{formatDayNumber(date)}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="mb-3 text-lg font-bold capitalize">
                {selectedDay.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="space-y-3">
                {(["lunch", "dinner"] as const).map((slot) => {
                  const dateKey = formatDateKey(selectedDay);
                  const slotMeals = mealsBySlotKey.get(`${dateKey}:${slot}`) ?? [];
                  const addHref = `/calendar/new?date=${dateKey}&slot=${slot}&locationId=${encodeURIComponent(defaultLocationId)}`;

                  if (slotMeals.length === 0) {
                    return (
                      <Link
                        key={slot}
                        href={addHref}
                        className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/30 p-4 transition-colors hover:border-primary/40"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase text-primary">
                            {getSlotLabel(slot)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Aucun repas prévu
                          </p>
                        </div>
                        <span className="text-primary">+</span>
                      </Link>
                    );
                  }

                  return slotMeals.map((meal) => {
                    const status = getStatusBadge(meal.status);

                    return (
                      <Link
                        key={meal.id}
                        href={`/calendar/${meal.id}`}
                        className="block rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase text-primary">
                              {getSlotLabel(meal.meal_slot)}
                            </p>
                            <p className="mt-1 text-base font-semibold text-foreground">
                              {meal.title}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {meal.location_id && locationNameById[meal.location_id] ? (
                            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-foreground">
                              {locationNameById[meal.location_id]}
                            </span>
                          ) : null}
                          {meal.responsible_profile_id &&
                          memberNameByProfileId[meal.responsible_profile_id] ? (
                            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              {memberNameByProfileId[meal.responsible_profile_id]}
                            </span>
                          ) : null}
                        </div>
                        {meal.notes ? (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {meal.notes}
                          </p>
                        ) : null}
                      </Link>
                    );
                  });
                })}
              </div>
            </div>

            <Link
              href={`/calendar/new?date=${formatDateKey(selectedDay)}&slot=lunch&locationId=${encodeURIComponent(defaultLocationId)}`}
              className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground shadow-lg transition-transform hover:scale-105 md:hidden"
            >
              +
            </Link>
          </div>
        </>
      )}

      {view === "month" && (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border xl:block">
            <div className="grid grid-cols-7 border-b border-border bg-muted/50">
              {["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"].map((day) => (
                <div
                  key={day}
                  className="border-l border-border px-2 py-2 text-center text-xs font-semibold text-muted-foreground first:border-l-0"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthGridDates.map((date, index) => {
                const dateKey = formatDateKey(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isToday = isSameDay(date, today);
                const dayMeals = mealsByDateKey.get(dateKey) ?? [];
                const lunchMeals = dayMeals.filter((meal) => meal.meal_slot === "lunch");
                const dinnerMeals = dayMeals.filter((meal) => meal.meal_slot === "dinner");

                return (
                  <button
                    key={dateKey + index}
                    onClick={() => {
                      setCurrentDate(date);
                      setSelectedDay(date);
                      setView("week");
                    }}
                    className={`min-h-[100px] border-l border-t border-border p-1.5 text-left transition-colors hover:bg-accent/30 first:border-l-0 [&:nth-child(-n+7)]:border-t-0 ${
                      isToday ? "bg-accent/20" : ""
                    } ${!isCurrentMonth ? "opacity-40" : ""}`}
                  >
                    <span
                      className={`inline-flex size-6 items-center justify-center text-xs font-medium ${
                        isToday
                          ? "rounded-full bg-primary font-bold text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {formatDayNumber(date)}
                    </span>
                    {isCurrentMonth ? (
                      <div className="mt-1 space-y-0.5">
                        {lunchMeals.slice(0, 1).map((meal) => (
                          <div
                            key={meal.id}
                            className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                          >
                            Midi · {meal.title}
                          </div>
                        ))}
                        {dinnerMeals.slice(0, 1).map((meal) => (
                          <div
                            key={meal.id}
                            className="truncate rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"
                          >
                            Soir · {meal.title}
                          </div>
                        ))}
                        {dayMeals.length > 2 ? (
                          <div className="px-1 text-[9px] text-muted-foreground">
                            +{dayMeals.length - 2} autre{dayMeals.length - 2 > 1 ? "s" : ""}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xl:hidden">
            <div className="grid grid-cols-7 gap-0 overflow-hidden rounded-2xl border border-border">
              {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
                <div
                  key={index}
                  className="border-b border-border bg-muted/50 py-2 text-center text-[10px] font-semibold text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {monthGridDates.map((date, index) => {
                const dateKey = formatDateKey(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isToday = isSameDay(date, today);
                const dayMeals = mealsByDateKey.get(dateKey) ?? [];

                return (
                  <button
                    key={dateKey + index}
                    onClick={() => {
                      setCurrentDate(date);
                      setSelectedDay(date);
                      setView("week");
                    }}
                    className={`flex min-h-[3rem] flex-col items-center justify-center gap-1 border-l border-t border-border px-1 py-2 transition-colors first:border-l-0 [&:nth-child(7n+1)]:border-l-0 [&:nth-child(-n+14)]:border-t-0 ${
                      !isCurrentMonth ? "opacity-30" : ""
                    }`}
                  >
                    <span
                      className={`flex size-6 items-center justify-center text-xs ${
                        isToday
                          ? "rounded-full bg-primary font-bold text-primary-foreground"
                          : "font-medium text-foreground"
                      }`}
                    >
                      {formatDayNumber(date)}
                    </span>
                    {isCurrentMonth && dayMeals.length > 0 ? (
                      <div className="flex gap-0.5">
                        {dayMeals.slice(0, 3).map((meal) => (
                          <div key={meal.id} className="size-1.5 rounded-full bg-primary" />
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
