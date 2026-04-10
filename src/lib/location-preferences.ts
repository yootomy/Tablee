export function getPreferredLocationId<T extends { id: string }>(
  locations: T[],
  preferredLocationId: string | null | undefined,
) {
  if (preferredLocationId && locations.some((location) => location.id === preferredLocationId)) {
    return preferredLocationId;
  }

  return locations[0]?.id ?? null;
}
