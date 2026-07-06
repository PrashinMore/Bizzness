export type RecipeUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';

export const RECIPE_UNITS: readonly RecipeUnit[] = ['g', 'kg', 'ml', 'l', 'pcs'] as const;

export interface RecipeItem {
  id: string;
  recipeId: string;
  ingredientProductId: string;
  quantity: number;
  unit: RecipeUnit;
  createdAt?: string;
  updatedAt?: string;
}

export interface Recipe {
  id: string;
  productId: string;
  organizationId: string;
  outletId: string | null;
  items: RecipeItem[];
  createdAt: string;
  updatedAt: string;
}

/** Row used by the editor UI (pre-save). IDs are optional for new rows. */
export interface RecipeItemDraft {
  id?: string;
  ingredientProductId: string;
  quantity: number | '';
  unit: RecipeUnit;
}
