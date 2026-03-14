export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealPlanRecipeOption {
    id: number;
    title: string;
    imageUrls?: string[];
    servings: number;
    cookingMinutes: number;
}

export interface MealPlanEntry {
    id: number;
    plannedDate: string;
    mealType: MealType;
    recipeId: number;
    recipeTitle: string;
    recipeImageUrl?: string;
    servings: number;
    cookingMinutes: number;
}

export interface MealPlanUpsertPayload {
    plannedDate: string;
    mealType: MealType;
    recipeId: number;
}

export interface AddMealPlanDaysToShoppingListPayload {
    plannedDates: string[];
}

export interface AddMealPlanDaysToShoppingListResult {
    selectedDaysCount: number;
    addedItemsCount: number;
}
