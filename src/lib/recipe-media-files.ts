import { promises as fs } from "node:fs";
import path from "node:path";
import {
  LEGACY_RECIPE_MEDIA_STORAGE_DIR,
  RECIPE_MEDIA_STORAGE_DIR,
} from "@/lib/recipe-media-storage";

export async function findRecipeMediaFile(filename: string) {
  const safeFilename = path.basename(filename);
  const candidates = [
    path.join(RECIPE_MEDIA_STORAGE_DIR, safeFilename),
    path.join(LEGACY_RECIPE_MEDIA_STORAGE_DIR, safeFilename),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  return null;
}
