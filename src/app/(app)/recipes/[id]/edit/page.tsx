import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { RecipeForm } from "@/components/forms/recipe-form";
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
      <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/50 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <ChefHat className="size-6 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-primary">Modifier une recette</p>
          <h2 className="mt-0.5 text-xl font-extrabold sm:text-2xl">{recipe.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste le titre, les portions, les ingrédients et les étapes de préparation.
          </p>
        </div>
      </div>

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
