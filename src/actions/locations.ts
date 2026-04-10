"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";

type ActionResult = { success: true } | { success: false; error: string };

const createLocationSchema = z.object({
  name: z.string().trim().min(1, "Le nom du lieu est requis"),
});

const updateLocationSchema = z.object({
  locationId: z.string().uuid("Le lieu est introuvable"),
  name: z.string().trim().min(1, "Le nom du lieu est requis"),
});

export async function createLocation(formData: FormData): Promise<ActionResult> {
  const { familyId } = await requireActiveFamily();

  const parsed = createLocationSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await prisma.locations.create({
    data: {
      family_id: familyId,
      name: parsed.data.name,
    },
  });

  revalidatePath("/family/locations");

  return { success: true };
}

export async function updateLocation(formData: FormData): Promise<ActionResult> {
  const { familyId } = await requireActiveFamily();

  const parsed = updateLocationSchema.safeParse({
    locationId: formData.get("locationId"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const result = await prisma.locations.updateMany({
    where: {
      id: parsed.data.locationId,
      family_id: familyId,
      archived_at: null,
    },
    data: {
      name: parsed.data.name,
    },
  });

  if (result.count === 0) {
    return { success: false, error: "Le lieu demandé est introuvable" };
  }

  revalidatePath("/family/locations");

  return { success: true };
}
