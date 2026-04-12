import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  LEGACY_RECIPE_MEDIA_STORAGE_DIR,
  RECIPE_MEDIA_STORAGE_DIR,
} from "@/lib/recipe-media-storage";

type RouteContext = {
  params: Promise<{ filename: string }>;
};

function getContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

async function findRecipeMediaFile(filename: string) {
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

export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params;
  const filePath = await findRecipeMediaFile(filename);

  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await fs.readFile(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": getContentType(filename),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
