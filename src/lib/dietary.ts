export const DIETARY_REGIMES = [
  { value: "vegetarian", label: "Végétarien·ne" },
  { value: "vegan", label: "Végan·e" },
  { value: "gluten_free", label: "Sans gluten" },
  { value: "halal", label: "Halal" },
  { value: "pescatarian", label: "Pescatarien·ne" },
] as const;

export const DIETARY_ALLERGENS = [
  { value: "lactose", label: "Lactose / lait" },
  { value: "gluten", label: "Gluten" },
  { value: "eggs", label: "Œufs" },
  { value: "peanuts", label: "Arachides" },
  { value: "nuts", label: "Fruits à coque" },
  { value: "seafood", label: "Fruits de mer" },
  { value: "soy", label: "Soja" },
] as const;

export type DietaryRegime = (typeof DIETARY_REGIMES)[number]["value"];
export type DietaryAllergen = (typeof DIETARY_ALLERGENS)[number]["value"];

export const ALL_REGIME_VALUES = DIETARY_REGIMES.map((r) => r.value);
export const ALL_ALLERGEN_VALUES = DIETARY_ALLERGENS.map((a) => a.value);

export function getRegimeLabel(value: string): string {
  return DIETARY_REGIMES.find((r) => r.value === value)?.label ?? value;
}

export function getAllergenLabel(value: string): string {
  return DIETARY_ALLERGENS.find((a) => a.value === value)?.label ?? value;
}

/** vegan implies vegetarian for conflict detection */
export function regimeImplies(memberRegime: string, recipeTag: string): boolean {
  if (memberRegime === "vegetarian" && recipeTag === "vegan") return true;
  return false;
}

export type DietaryConflict = {
  type: "allergen" | "regime";
  value: string;
  label: string;
  memberNames: string[];
};

export function computeDietaryConflicts(
  recipe: { dietary_tags: string[]; allergen_flags: string[] },
  memberPreferences: { memberName: string; type: string; value: string }[],
): DietaryConflict[] {
  const conflicts: Map<string, DietaryConflict> = new Map();

  for (const pref of memberPreferences) {
    if (pref.type === "allergen") {
      if (recipe.allergen_flags.includes(pref.value)) {
        const key = `allergen:${pref.value}`;
        const existing = conflicts.get(key);
        if (existing) {
          existing.memberNames.push(pref.memberName);
        } else {
          conflicts.set(key, {
            type: "allergen",
            value: pref.value,
            label: getAllergenLabel(pref.value),
            memberNames: [pref.memberName],
          });
        }
      }
    } else if (pref.type === "regime") {
      const recipeSupports =
        recipe.dietary_tags.includes(pref.value) ||
        recipe.dietary_tags.some((tag) => regimeImplies(pref.value, tag));

      if (!recipeSupports) {
        const key = `regime:${pref.value}`;
        const existing = conflicts.get(key);
        if (existing) {
          existing.memberNames.push(pref.memberName);
        } else {
          conflicts.set(key, {
            type: "regime",
            value: pref.value,
            label: getRegimeLabel(pref.value),
            memberNames: [pref.memberName],
          });
        }
      }
    }
  }

  return Array.from(conflicts.values());
}
