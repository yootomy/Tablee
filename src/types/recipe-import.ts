export type RecipeIngredientDraft = {
  name: string;
  quantity: string;
  unit: string;
  note: string;
};

export type RecipeStepDraft = {
  instruction: string;
};

export type RecipeFormDraft = {
  title: string;
  description: string;
  prepTimeMinutes: string;
  cookTimeMinutes: string;
  servings: string;
  sourceUrl: string;
  imageUrl: string;
  ingredients: RecipeIngredientDraft[];
  steps: RecipeStepDraft[];
  dietaryTags: string[];
  allergenFlags: string[];
};

export type ImportedRecipeDraft = RecipeFormDraft & {
  warnings: string[];
  confidence: number | null;
  source: {
    platform: "tiktok" | "instagram";
    creatorName: string;
    title: string;
    description: string;
    thumbnailUrl: string;
  };
};
