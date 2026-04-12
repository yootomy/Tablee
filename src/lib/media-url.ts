import {
  getRecipeMediaFilename,
  getRecipeMediaUrl,
  RECIPE_MEDIA_ROUTE_PREFIX,
} from "@/lib/recipe-media-storage";

const BASE_PATH = "/tablee";

function hasProtocol(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:");
}

export function resolveMediaUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (
    trimmed.includes("/imported/recipes/") ||
    trimmed.includes(`${RECIPE_MEDIA_ROUTE_PREFIX}/`)
  ) {
    const filename = getRecipeMediaFilename(trimmed);
    return `${BASE_PATH}${getRecipeMediaUrl(filename)}`;
  }

  if (hasProtocol(trimmed) || trimmed.startsWith(BASE_PATH)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `${BASE_PATH}${trimmed}`;
  }

  return `${BASE_PATH}/${trimmed.replace(/^\/+/, "")}`;
}
