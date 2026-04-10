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

const setPreferredLocationSchema = z.object({
  locationId: z.string().uuid("Le lieu par défaut est introuvable"),
});

export async function createLocation(formData: FormData): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamily();

  const parsed = createLocationSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await prisma.$transaction(async (tx) => {
    const activeLocationCount = await tx.locations.count({
      where: {
        family_id: familyId,
        archived_at: null,
      },
    });

    const location = await tx.locations.create({
      data: {
        family_id: familyId,
        name: parsed.data.name,
      },
    });

    if (activeLocationCount === 0) {
      await tx.family_context_preferences.upsert({
        where: {
          profile_id_family_id: {
            profile_id: profileId,
            family_id: familyId,
          },
        },
        update: {
          last_selected_location_id: location.id,
        },
        create: {
          profile_id: profileId,
          family_id: familyId,
          last_selected_location_id: location.id,
        },
      });
    }
  });

  revalidatePath("/family/locations");
  revalidatePath("/shopping");

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

export async function setPreferredLocation(
  formData: FormData,
): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamily();

  const parsed = setPreferredLocationSchema.safeParse({
    locationId: formData.get("locationId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const location = await prisma.locations.findFirst({
    where: {
      id: parsed.data.locationId,
      family_id: familyId,
      archived_at: null,
    },
    select: { id: true },
  });

  if (!location) {
    return { success: false, error: "Le lieu demandé est introuvable" };
  }

  await prisma.family_context_preferences.upsert({
    where: {
      profile_id_family_id: {
        profile_id: profileId,
        family_id: familyId,
      },
    },
    update: {
      last_selected_location_id: location.id,
    },
    create: {
      profile_id: profileId,
      family_id: familyId,
      last_selected_location_id: location.id,
    },
  });

  revalidatePath("/family/locations");
  revalidatePath("/shopping");

  return { success: true };
}
