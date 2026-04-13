import path from "node:path";

export const RECIPE_MEDIA_ROUTE_PREFIX = "/recipe-images";
export const RECIPE_MEDIA_STORAGE_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "var",
  "imported",
  "recipes",
);
export const LEGACY_RECIPE_MEDIA_STORAGE_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "public",
  "imported",
  "recipes",
);

export function getRecipeMediaFilename(value: string) {
  return path.basename(value);
}

export function getRecipeMediaUrl(filename: string) {
  return `${RECIPE_MEDIA_ROUTE_PREFIX}/${filename}`;
}

export function getRecipeScopedMediaUrl(recipeId: string) {
  return `/recipes/${recipeId}/image`;
}
