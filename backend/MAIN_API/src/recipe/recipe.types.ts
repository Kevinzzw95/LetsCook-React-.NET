export interface StepInput { stepNumber: number; description: string; }
export interface IngredientInput { id?: string; amount?: string; unit?: string; name: string; }

export interface RecipeForm {
  title: string;
  servings?: string | number;
  preparationMinutes?: string | number;
  cookingMinutes?: string | number;
  sourceName: string;
  sourceUrl?: string;
  cuisine?: string;
  diets?: string | string[];
  steps: string;
  dishType?: string;
  summary?: string;
  ingredients: string;
  ingredientsEn?: string;
  imageInfo?: string;
  existingImageUrls?: string;
}
