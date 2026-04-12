"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { getMealWeekHref } from "@/lib/calendar";

type ActionResult =
  | { success: true; recipeId?: string }
  | { success: false; error: string };

const ingredientSchema = z.object({
  name: z.string().trim().min(1, "Chaque ingrédient doit avoir un nom"),
  quantity: z.string().trim().optional().default(""),
  unit: z.string().trim().optional().default(""),
  note: z.string().trim().optional().default(""),
});

const stepSchema = z.object({
  instruction: z.string().trim().min(1, "Chaque étape doit avoir une instruction"),
});

const recipePayloadSchema = z.object({
  title: z.string().trim().min(2, "Le titre doit faire au moins 2 caractères"),
  description: z.string().trim().optional().transform((value) => value || undefined),
  prepTimeMinutes: z.coerce
    .number()
    .int()
    .min(0, "Le temps de préparation doit être positif")
    .max(1440, "Le temps de préparation semble trop élevé")
    .optional(),
  cookTimeMinutes: z.coerce
    .number()
    .int()
    .min(0, "Le temps de cuisson doit être positif")
    .max(1440, "Le temps de cuisson semble trop élevé")
    .optional(),
  servings: z.coerce
    .number()
    .int()
    .min(1, "Le nombre de portions doit être d'au moins 1")
    .max(100, "Le nombre de portions semble trop élevé")
    .optional(),
  sourceUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.string().url("Le lien source doit être une URL valide").optional()),
  ingredients: z
    .array(ingredientSchema)
    .min(1, "Ajoutez au moins un ingrédient"),
  steps: z.array(stepSchema).min(1, "Ajoutez au moins une étape"),
});

function parseOptionalInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return Number(value);
}

function parseJsonField<T>(value: FormDataEntryValue | null): T | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parseIngredientQuantity(quantity: string) {
  const trimmed = quantity.trim();

  if (!trimmed) {
    return {
      quantity_numeric: null,
      raw_quantity_text: null,
    };
  }

  const normalized = trimmed.replace(",", ".");
  const isNumeric = /^\d+(\.\d+)?$/.test(normalized);

  if (!isNumeric) {
    return {
      quantity_numeric: null,
      raw_quantity_text: trimmed,
    };
  }

  return {
    quantity_numeric: normalized,
    raw_quantity_text: null,
  };
}

function parseRecipePayload(formData: FormData) {
  const ingredients = parseJsonField<
    Array<{ name: string; quantity?: string; unit?: string; note?: string }>
  >(formData.get("ingredients"));
  const steps = parseJsonField<Array<{ instruction: string }>>(formData.get("steps"));

  if (!ingredients || !steps) {
    return {
      success: false as const,
      error: "Le formulaire de recette est incomplet",
    };
  }

  const filteredIngredients = ingredients.filter(
    (ingredient) =>
      ingredient.name?.trim() ||
      ingredient.quantity?.trim() ||
      ingredient.unit?.trim() ||
      ingredient.note?.trim(),
  );

  const filteredSteps = steps.filter((step) => step.instruction?.trim());

  const parsed = recipePayloadSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    prepTimeMinutes: parseOptionalInteger(formData.get("prepTimeMinutes")),
    cookTimeMinutes: parseOptionalInteger(formData.get("cookTimeMinutes")),
    servings: parseOptionalInteger(formData.get("servings")),
    sourceUrl: formData.get("sourceUrl"),
    ingredients: filteredIngredients,
    steps: filteredSteps,
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

export async function createRecipe(formData: FormData): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamily();
  const payload = parseRecipePayload(formData);

  if (!payload.success) {
    return payload;
  }

  const recipe = await prisma.$transaction(async (tx) => {
    const createdRecipe = await tx.recipes.create({
      data: {
        family_id: familyId,
        created_by_profile_id: profileId,
        title: payload.data.title,
        description: payload.data.description,
        prep_time_minutes: payload.data.prepTimeMinutes,
        cook_time_minutes: payload.data.cookTimeMinutes,
        servings: payload.data.servings,
        source_url: payload.data.sourceUrl,
      },
    });

    await tx.recipe_ingredients.createMany({
      data: payload.data.ingredients.map((ingredient, index) => {
        const quantity = parseIngredientQuantity(ingredient.quantity ?? "");

        return {
          recipe_id: createdRecipe.id,
          position: index,
          name: ingredient.name,
          unit: ingredient.unit || null,
          note: ingredient.note || null,
          quantity_numeric: quantity.quantity_numeric,
          raw_quantity_text: quantity.raw_quantity_text,
        };
      }),
    });

    await tx.recipe_steps.createMany({
      data: payload.data.steps.map((step, index) => ({
        recipe_id: createdRecipe.id,
        position: index,
        instruction: step.instruction,
      })),
    });

    return createdRecipe;
  });

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function deleteRecipe(recipeId: string): Promise<ActionResult> {
  const { familyId } = await requireActiveFamily();

  const recipe = await prisma.recipes.findFirst({
    where: { id: recipeId, family_id: familyId, archived_at: null },
    select: {
      id: true,
      meal_plans: {
        select: {
          id: true,
          meal_date: true,
          location_id: true,
        },
      },
    },
  });

  if (!recipe) {
    return { success: false, error: "La recette demandée est introuvable" };
  }

  await prisma.$transaction(async (tx) => {
    if (recipe.meal_plans.length > 0) {
      await tx.meal_plans.deleteMany({
        where: {
          family_id: familyId,
          recipe_id: recipeId,
        },
      });
    }

    await tx.recipes.update({
      where: { id: recipeId },
      data: { archived_at: new Date() },
    });
  });

  revalidatePath("/recipes");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/shopping");

  for (const mealPlan of recipe.meal_plans) {
    revalidatePath(`/calendar/${mealPlan.id}`);
    revalidatePath(getMealWeekHref(mealPlan.meal_date, mealPlan.location_id));
  }

  redirect("/recipes");
}

export async function updateRecipe(formData: FormData): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamily();
  const recipeId = formData.get("recipeId");

  if (typeof recipeId !== "string") {
    return { success: false, error: "La recette demandée est introuvable" };
  }

  const payload = parseRecipePayload(formData);

  if (!payload.success) {
    return payload;
  }

  const existingRecipe = await prisma.recipes.findFirst({
    where: {
      id: recipeId,
      family_id: familyId,
      archived_at: null,
    },
    select: { id: true },
  });

  if (!existingRecipe) {
    return { success: false, error: "La recette demandée est introuvable" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.recipes.update({
      where: { id: recipeId },
      data: {
        title: payload.data.title,
        description: payload.data.description,
        prep_time_minutes: payload.data.prepTimeMinutes,
        cook_time_minutes: payload.data.cookTimeMinutes,
        servings: payload.data.servings,
        source_url: payload.data.sourceUrl,
        updated_by_profile_id: profileId,
      },
    });

    await tx.recipe_ingredients.deleteMany({
      where: { recipe_id: recipeId },
    });

    await tx.recipe_steps.deleteMany({
      where: { recipe_id: recipeId },
    });

    await tx.recipe_ingredients.createMany({
      data: payload.data.ingredients.map((ingredient, index) => {
        const quantity = parseIngredientQuantity(ingredient.quantity ?? "");

        return {
          recipe_id: recipeId,
          position: index,
          name: ingredient.name,
          unit: ingredient.unit || null,
          note: ingredient.note || null,
          quantity_numeric: quantity.quantity_numeric,
          raw_quantity_text: quantity.raw_quantity_text,
        };
      }),
    });

    await tx.recipe_steps.createMany({
      data: payload.data.steps.map((step, index) => ({
        recipe_id: recipeId,
        position: index,
        instruction: step.instruction,
      })),
    });
  });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}
