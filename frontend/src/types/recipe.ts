import { Ingredient } from "./ingredient"
import { instruction } from "./instruction";
import { SearchItem } from "./searchItem";
import { Step } from "./step";

export interface recipeCommon {
    "id"?: string,
    "title": string,
    "imageUrls"?: string[],
    "imageType"?: string,
    "servings": number,
    "readyInMinutes"?: number,
    "cookingMinutes"?: number,
    "preparationMinutes"?: number,
    "sourceName": string,
    "sourceUrl"?: string,
    "cuisine"?: string,
    "instructions": instruction[],
    "diet"?: string,
    "type"?: string,
    "extendedIngredients": Ingredient[],
    "calories"?: number,
    "protein"?: number,
    "carbohydrate"?: number,
    "fat"?: number,
    "summary"?: string
}

export interface recipeSearchRes {
    results: SearchItem[],
    offset: number,
    number: number,
    totalResults: number
}

export interface RecipeDraft {
    title: string,
    servings: number,
    preparationMinutes?: number,
    type?: string, 
    cuisine?: string,
    diet?: string,
    prepTime?: number,
    ingredients: Ingredient[],
    steps: Step[],
    sourceName?: string,
    images?: (File | string)[]
}

export enum Tab {
    UPLOAD = 'uploadRecipes',
    OVERVIEW = 'overview',
    INGREDIENTS = 'ingredients',
    STEPS = 'steps',
    NOTES = 'notes',
    IMAGES = 'images'
}
