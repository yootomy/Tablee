export function parseIngredientQuantity(quantity: string) {
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
