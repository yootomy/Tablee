export function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h${rem}` : `${hours}h`;
}

export function formatQuantity(item: {
  quantity_numeric: { toString(): string } | null;
  raw_quantity_text: string | null;
  unit: string | null;
}): string | null {
  if (item.quantity_numeric) {
    return `${item.quantity_numeric.toString()}${item.unit ? " " + item.unit : ""}`;
  }
  if (item.raw_quantity_text) return item.raw_quantity_text;
  return null;
}
