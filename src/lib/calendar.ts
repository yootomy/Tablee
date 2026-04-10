const DAY_IN_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function addDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * DAY_IN_MS);
}

export function getWeekStart(value: Date | string) {
  const date = typeof value === "string" ? parseDateOnly(value) : value;
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function getWeekDates(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function getMealWeekHref(date: Date, locationId?: string | null) {
  const week = formatDateKey(getWeekStart(date));
  const params = new URLSearchParams({ week });

  if (locationId) {
    params.set("locationId", locationId);
  }

  return `/calendar?${params.toString()}`;
}

export function formatCalendarHeader(date: Date) {
  return date.toLocaleDateString("fr-CH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDateInputValue(date: Date) {
  return formatDateKey(date);
}

export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

export function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12, 0, 0, 0);
}

export function addMonths(date: Date, amount: number) {
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12, 0, 0, 0);
  return result;
}

/**
 * Returns 42 dates (6 rows x 7 columns) for a month grid view.
 * Starts from the Monday of the week containing the 1st of the month.
 */
export function getMonthGridDates(date: Date) {
  const monthStart = getMonthStart(date);
  const gridStart = getWeekStart(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function formatMonthYear(date: Date) {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function formatShortDay(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short" });
}

export function formatDayNumber(date: Date) {
  return date.getDate();
}
