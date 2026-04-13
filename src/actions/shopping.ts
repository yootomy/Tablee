"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { getMealWeekHref } from "@/lib/calendar";
import { parseIngredientQuantity } from "@/lib/ingredient-quantity";

type ActionResult = { success: true } | { success: false; error: string };

const manualShoppingItemSchema = z.object({
  locationId: z.string().uuid("Le lieu sélectionné est invalide"),
  name: z.string().trim().min(1, "Le nom de l'article est requis"),
  quantity: z.string().trim().optional().default(""),
  unit: z.string().trim().optional().default(""),
  comment: z.string().trim().optional().default(""),
});

const toggleShoppingItemSchema = z.object({
  itemId: z.string().uuid("L'article est invalide"),
  nextCompleted: z.enum(["true", "false"]),
});

const deleteShoppingItemSchema = z.object({
  itemId: z.string().uuid("L'article est invalide"),
});

const addRecipeIngredientsSchema = z.object({
  recipeId: z.string().uuid("La recette sélectionnée est invalide"),
  locationId: z.string().uuid("Le lieu sélectionné est invalide"),
});

const addMealIngredientsSchema = z.object({
  mealPlanId: z.string().uuid("Le repas sélectionné est invalide"),
  locationId: z.string().uuid("Le lieu sélectionné est invalide"),
});

async function ensureLocationBelongsToFamily(
  familyId: string,
  locationId: string,
) {
  const location = await prisma.locations.findFirst({
    where: {
      id: locationId,
      family_id: familyId,
      archived_at: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return location;
}

function revalidateShoppingViews(locationId: string) {
  revalidatePath("/shopping");
  revalidatePath(`/shopping?locationId=${locationId}`);
  revalidatePath("/dashboard");
}

async function createShoppingItemsFromIngredients({
  familyId,
  profileId,
  locationId,
  ingredients,
  sourceRecipeId,
  sourceMealPlanId,
}: {
  familyId: string;
  profileId: string;
  locationId: string;
  ingredients: Array<{
    name: string;
    quantity_numeric: { toString(): string } | null;
    raw_quantity_text: string | null;
    unit: string | null;
    note: string | null;
  }>;
  sourceRecipeId?: string | null;
  sourceMealPlanId?: string | null;
}) {
  if (ingredients.length === 0) {
    return { success: false as const, error: "Cette recette ne contient aucun ingrédient" };
  }

  await prisma.shopping_items.createMany({
    data: ingredients.map((ingredient) => ({
      family_id: familyId,
      location_id: locationId,
      name: ingredient.name,
      quantity_numeric: ingredient.quantity_numeric?.toString() ?? null,
      unit: ingredient.unit ?? null,
      raw_quantity_text: ingredient.raw_quantity_text ?? null,
      comment: ingredient.note ?? null,
      created_by_profile_id: profileId,
      source_recipe_id: sourceRecipeId ?? null,
      source_meal_plan_id: sourceMealPlanId ?? null,
    })),
  });

  return { success: true as const };
}

export async function addManualShoppingItem(
  formData: FormData,
): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamily();

  const parsed = manualShoppingItemSchema.safeParse({
    locationId: formData.get("locationId"),
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const location = await ensureLocationBelongsToFamily(
    familyId,
    parsed.data.locationId,
  );

  if (!location) {
    return { success: false, error: "Le lieu sélectionné n'existe pas dans cette famille" };
  }

  const quantity = parseIngredientQuantity(parsed.data.quantity);

  await prisma.shopping_items.create({
    data: {
      family_id: familyId,
      location_id: parsed.data.locationId,
      name: parsed.data.name,
      quantity_numeric: quantity.quantity_numeric,
      unit: parsed.data.unit || null,
      raw_quantity_text: quantity.raw_quantity_text,
      comment: parsed.data.comment || null,
      created_by_profile_id: profileId,
    },
  });

  revalidateShoppingViews(parsed.data.locationId);

  return { success: true };
}

export async function toggleShoppingItem(
  formData: FormData,
): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamily();

  const parsed = toggleShoppingItemSchema.safeParse({
    itemId: formData.get("itemId"),
    nextCompleted: formData.get("nextCompleted"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const item = await prisma.shopping_items.findFirst({
    where: {
      id: parsed.data.itemId,
      family_id: familyId,
    },
    select: {
      id: true,
      location_id: true,
    },
  });

  if (!item) {
    return { success: false, error: "L'article demandé est introuvable" };
  }

  const nextCompleted = parsed.data.nextCompleted === "true";

  await prisma.shopping_items.update({
    where: { id: item.id },
    data: nextCompleted
      ? {
          is_completed: true,
          completed_by_profile_id: profileId,
          completed_at: new Date(),
        }
      : {
          is_completed: false,
          completed_by_profile_id: null,
          completed_at: null,
        },
  });

  revalidateShoppingViews(item.location_id);

  return { success: true };
}

export async function deleteShoppingItem(
  formData: FormData,
): Promise<ActionResult> {
  const { familyId } = await requireActiveFamily();

  const parsed = deleteShoppingItemSchema.safeParse({
    itemId: formData.get("itemId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const item = await prisma.shopping_items.findFirst({
    where: {
      id: parsed.data.itemId,
      family_id: familyId,
    },
    select: {
      id: true,
      location_id: true,
    },
  });

  if (!item) {
    return { success: false, error: "L'article demandé est introuvable" };
  }

  await prisma.shopping_items.delete({
    where: { id: item.id },
  });

  revalidateShoppingViews(item.location_id);

  return { success: true };
}

export async function addRecipeIngredientsToShopping(
  formData: FormData,
): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamily();

  const parsed = addRecipeIngredientsSchema.safeParse({
    recipeId: formData.get("recipeId"),
    locationId: formData.get("locationId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const [location, recipe] = await Promise.all([
    ensureLocationBelongsToFamily(familyId, parsed.data.locationId),
    prisma.recipes.findFirst({
      where: {
        id: parsed.data.recipeId,
        family_id: familyId,
        archived_at: null,
      },
      include: {
        recipe_ingredients: {
          orderBy: { position: "asc" },
        },
      },
    }),
  ]);

  if (!location) {
    return { success: false, error: "Le lieu sélectionné n'existe pas dans cette famille" };
  }

  if (!recipe) {
    return { success: false, error: "La recette demandée est introuvable" };
  }

  const result = await createShoppingItemsFromIngredients({
    familyId,
    profileId,
    locationId: parsed.data.locationId,
    ingredients: recipe.recipe_ingredients,
    sourceRecipeId: recipe.id,
  });

  if (!result.success) {
    return result;
  }

  revalidateShoppingViews(parsed.data.locationId);

  return { success: true };
}

export async function addMealIngredientsToShopping(
  formData: FormData,
): Promise<ActionResult> {
  const { familyId, profileId } = await requireActiveFamily();

  const parsed = addMealIngredientsSchema.safeParse({
    mealPlanId: formData.get("mealPlanId"),
    locationId: formData.get("locationId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const [location, mealPlan] = await Promise.all([
    ensureLocationBelongsToFamily(familyId, parsed.data.locationId),
    prisma.meal_plans.findFirst({
      where: {
        id: parsed.data.mealPlanId,
        family_id: familyId,
      },
      include: {
        recipes: {
          include: {
            recipe_ingredients: {
              orderBy: { position: "asc" },
            },
          },
        },
      },
    }),
  ]);

  if (!location) {
    return { success: false, error: "Le lieu sélectionné n'existe pas dans cette famille" };
  }

  if (!mealPlan) {
    return { success: false, error: "Le repas demandé est introuvable" };
  }

  if (!mealPlan.recipes) {
    return {
      success: false,
      error: "Ce repas n'est lié à aucune recette, donc il n'y a rien à envoyer aux courses",
    };
  }

  const result = await createShoppingItemsFromIngredients({
    familyId,
    profileId,
    locationId: parsed.data.locationId,
    ingredients: mealPlan.recipes.recipe_ingredients,
    sourceRecipeId: mealPlan.recipes.id,
    sourceMealPlanId: mealPlan.id,
  });

  if (!result.success) {
    return result;
  }

  revalidateShoppingViews(parsed.data.locationId);
  revalidatePath(getMealWeekHref(mealPlan.meal_date, mealPlan.location_id));

  return { success: true };
}
