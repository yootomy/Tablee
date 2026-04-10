import { RecipeForm } from "@/components/forms/recipe-form";
import { ChefHat } from "lucide-react";

export default function NewRecipePage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/50 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <ChefHat className="size-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">Nouvelle recette</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Saisis le titre, les ingrédients, les étapes et les informations utiles pour la famille.
          </p>
        </div>
      </div>

      <RecipeForm mode="create" />
    </div>
  );
}
