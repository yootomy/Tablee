import {
  getRecipeMediaFilename,
  getRecipeScopedMediaUrl,
  getRecipeMediaUrl,
  RECIPE_MEDIA_ROUTE_PREFIX,
} from "@/lib/recipe-media-storage";

const LEGACY_BASE_PATH = "/tablee";

function hasProtocol(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:");
}

export function resolveMediaUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (hasProtocol(trimmed)) {
    return trimmed;
  }

  const normalized = trimmed.startsWith(LEGACY_BASE_PATH)
    ? trimmed.slice(LEGACY_BASE_PATH.length) || "/"
    : trimmed;

  if (
    normalized.includes("/imported/recipes/") ||
    normalized.includes(`${RECIPE_MEDIA_ROUTE_PREFIX}/`)
  ) {
    const filename = getRecipeMediaFilename(normalized);
    return getRecipeMediaUrl(filename);
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return `/${normalized.replace(/^\/+/, "")}`;
}

export function resolveRecipeMediaUrl(
  recipeId: string,
  value: string | null | undefined,
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (
    trimmed.includes("/imported/recipes/") ||
    trimmed.includes(`${RECIPE_MEDIA_ROUTE_PREFIX}/`)
  ) {
    return getRecipeScopedMediaUrl(recipeId);
  }

  return resolveMediaUrl(trimmed);
}
