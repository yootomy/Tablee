import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveFamily } from "@/lib/auth-utils";
import { resolveFamilyEntitlements } from "@/lib/family-billing";
import { DIETARY_REGIMES, DIETARY_ALLERGENS } from "@/lib/dietary";
import { updateRecipeDietaryTags } from "@/actions/recipes";
import { RecipeForm } from "@/components/forms/recipe-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";

type EditRecipePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { familyId } = await requireActiveFamily();
  const { id } = await params;

  const [recipe, entitlements] = await Promise.all([
    prisma.recipes.findFirst({
      where: { id, family_id: familyId, archived_at: null },
      include: {
        recipe_ingredients: { orderBy: { position: "asc" } },
        recipe_steps: { orderBy: { position: "asc" } },
      },
    }),
    resolveFamilyEntitlements(familyId),
  ]);

  if (!recipe) {
    notFound();
  }

  const savedRegimes = new Set(recipe.dietary_tags);
  const savedAllergens = new Set(recipe.allergen_flags);

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
          dietaryTags: recipe.dietary_tags,
          allergenFlags: recipe.allergen_flags,
        }}
      />

      {entitlements.isPremiumActive ? (
        <form action={updateRecipeDietaryTags}>
          <input type="hidden" name="recipeId" value={recipe.id} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations alimentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <p className="text-sm text-muted-foreground">
                Générés automatiquement par l&apos;IA à l&apos;import. Corrige si besoin.
              </p>

              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Régimes</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {DIETARY_REGIMES.map((regime) => (
                    <label key={regime.value} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        name={`regime_${regime.value}`}
                        defaultChecked={savedRegimes.has(regime.value)}
                        className="size-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm">{regime.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Allergènes présents</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {DIETARY_ALLERGENS.map((allergen) => (
                    <label key={allergen.value} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        name={`allergen_${allergen.value}`}
                        defaultChecked={savedAllergens.has(allergen.value)}
                        className="size-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm">{allergen.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Sauvegarder les tags
              </Button>
            </CardContent>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
