"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { getMealWeekHref, getWeekStart, parseDateOnly } from "@/lib/calendar";

type ActionResult = { success: true } | { success: false; error: string };

function normalizeOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const mealPlanSchema = z.object({
  mealDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La date du repas est invalide"),
  mealSlot: z.enum(["lunch", "dinner"]),
  locationId: z.string().uuid("Le lieu sélectionné est invalide"),
  recipeId: z.string().uuid("La recette sélectionnée est invalide").optional(),
  responsibleProfileId: z
    .string()
    .uuid("Le responsable sélectionné est invalide")
    .optional(),
  title: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(["planned", "done", "canceled"]).default("planned"),
});

async function resolveMealPlanPayload(formData: FormData, familyId: string) {
  const parsed = mealPlanSchema.safeParse({
    mealDate: formData.get("mealDate"),
    mealSlot: formData.get("mealSlot"),
    locationId: formData.get("locationId"),
    recipeId: normalizeOptionalString(formData.get("recipeId")),
    responsibleProfileId: normalizeOptionalString(formData.get("responsibleProfileId")),
    title: normalizeOptionalString(formData.get("title")),
    notes: normalizeOptionalString(formData.get("notes")),
    status: normalizeOptionalString(formData.get("status")) ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const [location, recipe, responsible] = await Promise.all([
    prisma.locations.findFirst({
      where: {
        id: parsed.data.locationId,
        family_id: familyId,
        archived_at: null,
      },
      select: { id: true, name: true },
    }),
    parsed.data.recipeId
      ? prisma.recipes.findFirst({
          where: {
            id: parsed.data.recipeId,
            family_id: familyId,
            archived_at: null,
          },
          select: { id: true, title: true },
        })
      : Promise.resolve(null),
    parsed.data.responsibleProfileId
      ? prisma.family_members.findUnique({
          where: {
            family_id_profile_id: {
              family_id: familyId,
              profile_id: parsed.data.responsibleProfileId,
            },
          },
          select: { profile_id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!location) {
    return {
      success: false as const,
      error: "Le lieu sélectionné n'existe pas dans cette famille",
    };
  }

  if (parsed.data.recipeId && !recipe) {
    return {
      success: false as const,
      error: "La recette sélectionnée n'existe pas dans cette famille",
    };
  }

  if (parsed.data.responsibleProfileId && !responsible) {
    return {
      success: false as const,
      error: "Le responsable sélectionné n'appartient pas à cette famille",
    };
  }

  const title = parsed.data.title?.trim() || recipe?.title;

  if (!title || title.length < 2) {
    return {
      success: false as const,
      error: "Ajoute un titre libre ou choisis une recette pour préremplir le repas",
    };
  }

  return {
    success: true as const,
    data: {
      mealDate: parseDateOnly(parsed.data.mealDate),
      mealDateValue: parsed.data.mealDate,
      mealSlot: parsed.data.mealSlot,
      locationId: parsed.data.locationId,
      recipeId: recipe?.id ?? null,
      responsibleProfileId: responsible?.profile_id ?? null,
      title,
      notes: parsed.data.notes,
      status: parsed.data.status,
    },
  };
}

function revalidateMealPlanViews(date: Date) {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath(getMealWeekHref(getWeekStart(date)));
}

export async function createMealPlan(formData: FormData): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamily();
  const payload = await resolveMealPlanPayload(formData, familyId);

  if (!payload.success) {
    return payload;
  }

  await prisma.meal_plans.create({
    data: {
      family_id: familyId,
      recipe_id: payload.data.recipeId,
      location_id: payload.data.locationId,
      responsible_profile_id: payload.data.responsibleProfileId,
      meal_date: payload.data.mealDate,
      meal_slot: payload.data.mealSlot,
      status: "planned",
      title: payload.data.title,
      notes: payload.data.notes,
      created_by_profile_id: profileId,
    },
  });

  revalidateMealPlanViews(payload.data.mealDate);
  redirect(getMealWeekHref(payload.data.mealDate, payload.data.locationId));
}

export async function updateMealPlan(formData: FormData): Promise<ActionResult> {
  const { familyId } = await requireActiveFamily();
  const mealPlanId = formData.get("mealPlanId");

  if (typeof mealPlanId !== "string") {
    return { success: false, error: "Le repas demandé est introuvable" };
  }

  const existingMealPlan = await prisma.meal_plans.findFirst({
    where: {
      id: mealPlanId,
      family_id: familyId,
    },
    select: {
      id: true,
      meal_date: true,
      location_id: true,
    },
  });

  if (!existingMealPlan) {
    return { success: false, error: "Le repas demandé est introuvable" };
  }

  const payload = await resolveMealPlanPayload(formData, familyId);

  if (!payload.success) {
    return payload;
  }

  await prisma.meal_plans.update({
    where: { id: mealPlanId },
    data: {
      recipe_id: payload.data.recipeId,
      location_id: payload.data.locationId,
      responsible_profile_id: payload.data.responsibleProfileId,
      meal_date: payload.data.mealDate,
      meal_slot: payload.data.mealSlot,
      status: payload.data.status,
      title: payload.data.title,
      notes: payload.data.notes,
    },
  });

  revalidateMealPlanViews(existingMealPlan.meal_date);
  revalidateMealPlanViews(payload.data.mealDate);
  redirect(getMealWeekHref(payload.data.mealDate, payload.data.locationId));
}

export async function deleteMealPlan(mealPlanId: string): Promise<ActionResult> {
  const { familyId } = await requireActiveFamily();

  if (typeof mealPlanId !== "string") {
    return { success: false, error: "Le repas demandé est introuvable" };
  }

  const existingMealPlan = await prisma.meal_plans.findFirst({
    where: {
      id: mealPlanId,
      family_id: familyId,
    },
    select: {
      id: true,
      meal_date: true,
      location_id: true,
    },
  });

  if (!existingMealPlan) {
    return { success: false, error: "Le repas demandé est introuvable" };
  }

  await prisma.meal_plans.delete({
    where: { id: mealPlanId },
  });

  revalidatePath(`/calendar/${mealPlanId}`);
  revalidatePath(`/calendar/${mealPlanId}/edit`);
  revalidateMealPlanViews(existingMealPlan.meal_date);
  redirect(getMealWeekHref(existingMealPlan.meal_date, existingMealPlan.location_id));
}
