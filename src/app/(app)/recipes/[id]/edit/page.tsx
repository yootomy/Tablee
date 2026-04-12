import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { RecipeForm } from "@/components/forms/recipe-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { ChefHat } from "lucide-react";

type EditRecipePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { familyId } = await requireActiveFamily();
  const { id } = await params;

  const recipe = await prisma.recipes.findFirst({
    where: {
      id,
      family_id: familyId,
      archived_at: null,
    },
    include: {
      recipe_ingredients: {
        orderBy: { position: "asc" },
      },
      recipe_steps: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!recipe) {
    notFound();
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AppPageHeader
        eyebrow="Recettes"
        title={recipe.title}
        description="Ajuste les portions, les ingrédients et les étapes sans casser la fiche que la famille utilise déjà."
        badges={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
            <ChefHat className="size-3.5" />
            Édition
          </span>
        }
      />

      <RecipeForm
        mode="edit"
        recipeId={recipe.id}
        initialValues={{
          title: recipe.title,
          description: recipe.description ?? "",
          prepTimeMinutes: recipe.prep_time_minutes?.toString() ?? "",
          cookTimeMinutes: recipe.cook_time_minutes?.toString() ?? "",
          servings: recipe.servings?.toString() ?? "",
          sourceUrl: recipe.source_url ?? "",
          imageUrl: recipe.image_url ?? "",
          ingredients: recipe.recipe_ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity:
              ingredient.raw_quantity_text ??
              ingredient.quantity_numeric?.toString() ??
              "",
            unit: ingredient.unit ?? "",
            note: ingredient.note ?? "",
          })),
          steps: recipe.recipe_steps.map((step) => ({
            instruction: step.instruction,
          })),
        }}
      />
    </div>
  );
}
