import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireActiveFamily } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { findRecipeMediaFile } from "@/lib/recipe-media-files";
import {
  getRecipeMediaFilename,
} from "@/lib/recipe-media-storage";

type RouteContext = {
  params: Promise<{ id: string }>;
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

export async function GET(_request: Request, context: RouteContext) {
  let familyId: string;

  try {
    ({ familyId } = await requireActiveFamily());
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;

  const recipe = await prisma.recipes.findFirst({
    where: {
      id,
      family_id: familyId,
      archived_at: null,
    },
    select: {
      image_url: true,
    },
  });

  if (!recipe?.image_url) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filename = getRecipeMediaFilename(recipe.image_url);
  const filePath = await findRecipeMediaFile(filename);

  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await fs.readFile(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": getContentType(filename),
      "Cache-Control": "private, no-store",
    },
  });
}
