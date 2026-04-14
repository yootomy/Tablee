"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { ALL_REGIME_VALUES, ALL_ALLERGEN_VALUES } from "@/lib/dietary";

export async function saveDietaryPreferences(
  formData: FormData,
): Promise<void> {
  const { familyId, profileId } = await requireActiveFamily();

  const member = await prisma.family_members.findUnique({
    where: { family_id_profile_id: { family_id: familyId, profile_id: profileId } },
    select: { id: true },
  });

  if (!member) {
    throw new Error("Membre introuvable dans cette famille.");
  }

  const selectedRegimes = ALL_REGIME_VALUES.filter(
    (v) => formData.get(`regime_${v}`) === "on",
  );
  const selectedAllergens = ALL_ALLERGEN_VALUES.filter(
    (v) => formData.get(`allergen_${v}`) === "on",
  );

  await prisma.$transaction(async (tx) => {
    await tx.member_dietary_preferences.deleteMany({
      where: { family_member_id: member.id },
    });

    const toCreate = [
      ...selectedRegimes.map((v) => ({
        family_member_id: member.id,
        type: "regime" as const,
        value: v,
      })),
      ...selectedAllergens.map((v) => ({
        family_member_id: member.id,
        type: "allergen" as const,
        value: v,
      })),
    ];

    if (toCreate.length > 0) {
      await tx.member_dietary_preferences.createMany({ data: toCreate });
    }
  });

  revalidatePath("/profile/dietary");
}
