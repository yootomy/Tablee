"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createRecipe, updateRecipe } from "@/actions/recipes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSection } from "@/components/shared/form-section";
import { cn } from "@/lib/utils";
import { Plus, Trash2, X } from "lucide-react";

type IngredientInput = {
  name: string;
  quantity: string;
  unit: string;
  note: string;
};

type StepInput = {
  instruction: string;
};

interface RecipeFormProps {
  mode: "create" | "edit";
  recipeId?: string;
  initialValues?: {
    title: string;
    description: string;
    prepTimeMinutes: string;
    cookTimeMinutes: string;
    servings: string;
    sourceUrl: string;
    ingredients: IngredientInput[];
    steps: StepInput[];
  };
}

const blankIngredient = (): IngredientInput => ({
  name: "",
  quantity: "",
  unit: "",
  note: "",
});

const blankStep = (): StepInput => ({
  instruction: "",
});

const defaultValues = {
  title: "",
  description: "",
  prepTimeMinutes: "",
  cookTimeMinutes: "",
  servings: "",
  sourceUrl: "",
  ingredients: [],
  steps: [blankStep()],
};

function getIngredientQuantityLabel(ingredient: IngredientInput) {
  const quantity = ingredient.quantity.trim();
  const unit = ingredient.unit.trim();

  if (!quantity && !unit) {
    return null;
  }

  return [quantity, unit].filter(Boolean).join(" ");
}

function IngredientEditorDialog({
  open,
  mode,
  value,
  error,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean;
  mode: "create" | "edit";
  value: IngredientInput;
  error: string | null;
  onClose: () => void;
  onChange: (field: keyof IngredientInput, nextValue: string) => void;
  onSave: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingredient-editor-title"
        className="max-h-[min(calc(100dvh-2rem),calc(100vh-2rem))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-border bg-background p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 id="ingredient-editor-title" className="text-lg font-bold">
              {mode === "create" ? "Ajouter un ingrédient" : "Modifier l&apos;ingrédient"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Garde seulement l&apos;essentiel : nom, quantité, unité et note utile.
            </p>
          </div>

          <Button type="button" variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ingredient-dialog-name">Nom</Label>
            <Input
              id="ingredient-dialog-name"
              value={value.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="Ex: lardons fumés"
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[120px_120px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="ingredient-dialog-quantity">Quantité</Label>
              <Input
                id="ingredient-dialog-quantity"
                value={value.quantity}
                onChange={(event) => onChange("quantity", event.target.value)}
                placeholder="2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredient-dialog-unit">Unité</Label>
              <Input
                id="ingredient-dialog-unit"
                value={value.unit}
                onChange={(event) => onChange("unit", event.target.value)}
                placeholder="g"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredient-dialog-note">Note</Label>
              <Input
                id="ingredient-dialog-note"
                value={value.note}
                onChange={(event) => onChange("note", event.target.value)}
                placeholder="fumés, râpé, bio..."
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" onClick={onSave}>
              {mode === "create" ? "Ajouter" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecipeForm({
  mode,
  recipeId,
  initialValues = defaultValues,
}: RecipeFormProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    initialValues.prepTimeMinutes,
  );
  const [cookTimeMinutes, setCookTimeMinutes] = useState(
    initialValues.cookTimeMinutes,
  );
  const [servings, setServings] = useState(initialValues.servings);
  const [sourceUrl, setSourceUrl] = useState(initialValues.sourceUrl);
  const [ingredients, setIngredients] = useState(initialValues.ingredients);
  const [steps, setSteps] = useState(
    initialValues.steps.length > 0 ? initialValues.steps : [blankStep()],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [ingredientDialogMode, setIngredientDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(
    null,
  );
  const [ingredientDraft, setIngredientDraft] = useState<IngredientInput>(
    blankIngredient(),
  );
  const [ingredientDialogError, setIngredientDialogError] = useState<string | null>(
    null,
  );
  const [showMore, setShowMore] = useState(
    mode === "edit" || !!initialValues.description || !!initialValues.sourceUrl,
  );

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result =
      mode === "create"
        ? await createRecipe(formData)
        : await updateRecipe(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  function openIngredientDialog(mode: "create" | "edit", index?: number) {
    setIngredientDialogMode(mode);
    setIngredientDialogError(null);
    setEditingIngredientIndex(typeof index === "number" ? index : null);
    setIngredientDraft(
      typeof index === "number" ? ingredients[index] : blankIngredient(),
    );
    setIngredientDialogOpen(true);
  }

  function closeIngredientDialog() {
    setIngredientDialogOpen(false);
    setIngredientDialogError(null);
    setEditingIngredientIndex(null);
    setIngredientDraft(blankIngredient());
  }

  function saveIngredient() {
    if (!ingredientDraft.name.trim()) {
      setIngredientDialogError("Le nom de l'ingrédient est obligatoire.");
      return;
    }

    if (ingredientDialogMode === "edit" && editingIngredientIndex !== null) {
      setIngredients((current) =>
        current.map((ingredient, index) =>
          index === editingIngredientIndex ? ingredientDraft : ingredient,
        ),
      );
    } else {
      setIngredients((current) => [...current, ingredientDraft]);
    }

    closeIngredientDialog();
  }

  function removeIngredient(indexToRemove: number) {
    setIngredients((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  }

  function updateStep(index: number, value: string) {
    setSteps((current) =>
      current.map((step, currentIndex) =>
        currentIndex === index ? { instruction: value } : step,
      ),
    );
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-5">
        {recipeId ? <input type="hidden" name="recipeId" value={recipeId} /> : null}
        <input
          type="hidden"
          name="ingredients"
          value={JSON.stringify(ingredients)}
          readOnly
        />
        <input type="hidden" name="steps" value={JSON.stringify(steps)} readOnly />

        <FormSection
          title="Informations"
          description="Les infos clés pour reconnaître la recette d&apos;un coup d&apos;œil."
        >
            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Carbonara crémeuse"
                required
              />
            </div>

            {/* Prépa / Cuisson / Portions — une seule ligne */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="prepTimeMinutes" className="text-xs">Préparation</Label>
                <div className="relative">
                  <Input
                    id="prepTimeMinutes"
                    name="prepTimeMinutes"
                    type="number"
                    min="0"
                    value={prepTimeMinutes}
                    onChange={(event) => setPrepTimeMinutes(event.target.value)}
                    placeholder="0"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    min
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cookTimeMinutes" className="text-xs">Cuisson</Label>
                <div className="relative">
                  <Input
                    id="cookTimeMinutes"
                    name="cookTimeMinutes"
                    type="number"
                    min="0"
                    value={cookTimeMinutes}
                    onChange={(event) => setCookTimeMinutes(event.target.value)}
                    placeholder="0"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    min
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="servings" className="text-xs">Portions</Label>
                <Input
                  id="servings"
                  name="servings"
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(event) => setServings(event.target.value)}
                  placeholder="4"
                />
              </div>
            </div>

            {/* Options secondaires — masquées par défaut en création */}
            {!showMore && (
              <button
                type="button"
                onClick={() => setShowMore(true)}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Options (description, lien source)
              </button>
            )}

            {showMore && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs">Description</Label>
                  <textarea
                    id="description"
                    name="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Un petit contexte, une astuce, ou juste ce qui rend cette recette spéciale."
                    className="min-h-16 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sourceUrl" className="text-xs">Lien source</Label>
                  <Input
                    id="sourceUrl"
                    name="sourceUrl"
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}
        </FormSection>

        <FormSection
          title="Ingrédients"
          description={`${ingredients.length} ingrédient${ingredients.length > 1 ? "s" : ""}`}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openIngredientDialog("create")}
            >
              <Plus className="size-4" />
              Ajouter
            </Button>
          }
        >

          {ingredients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">
                Aucun ingrédient — utilise le bouton ci-dessus.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {ingredients.map((ingredient, index) => {
                const quantityLabel = getIngredientQuantityLabel(ingredient);

                return (
                  <div
                    key={`ingredient-${index}`}
                    className="rounded-xl border border-border bg-muted/15 p-3 transition-colors hover:border-primary/25 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-5">
                              {ingredient.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                              <span className="rounded-full bg-background px-2 py-0.5 ring-1 ring-border">
                                {quantityLabel ?? "Quantité libre"}
                              </span>
                              {ingredient.note.trim() ? (
                                <span className="rounded-full bg-background px-2 py-0.5 ring-1 ring-border">
                                  {ingredient.note}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => openIngredientDialog("edit", index)}
                        >
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeIngredient(index)}
                          aria-label={`Supprimer ${ingredient.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FormSection>

        <FormSection
          title="Étapes"
          description={`${steps.length} étape${steps.length > 1 ? "s" : ""}`}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSteps((current) => [...current, blankStep()])}
            >
              <Plus className="size-4" />
              Ajouter
            </Button>
          }
        >

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={`step-${index}`}
                className="flex gap-2.5 rounded-xl border border-border bg-muted/15 p-3"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <textarea
                    id={`step-instruction-${index}`}
                    value={step.instruction}
                    onChange={(event) => updateStep(index, event.target.value)}
                    className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm"
                    placeholder="Décris clairement ce qu'il faut faire."
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="shrink-0 self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    setSteps((current) =>
                      current.length === 1
                        ? [blankStep()]
                        : current.filter((_, currentIndex) => currentIndex !== index),
                    )
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </FormSection>

        {error ? (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            {loading
              ? mode === "create"
                ? "Création..."
                : "Enregistrement..."
              : mode === "create"
                ? "Créer la recette"
                : "Enregistrer"}
          </Button>
          <Link
            href="/recipes"
            className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center sm:w-auto")}
          >
            Retour aux recettes
          </Link>
        </div>
      </form>

      <IngredientEditorDialog
        open={ingredientDialogOpen}
        mode={ingredientDialogMode}
        value={ingredientDraft}
        error={ingredientDialogError}
        onClose={closeIngredientDialog}
        onChange={(field, nextValue) =>
          setIngredientDraft((current) => ({ ...current, [field]: nextValue }))
        }
        onSave={saveIngredient}
      />
    </>
  );
}
