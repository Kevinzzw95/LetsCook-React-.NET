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
    "cuisines"?: string,
    "cuisine"?: string,
    "diets"?: string[],
    "instructions": instruction[],
    "dishTypes"?: string[] | string,
    "dishType"?: string,
    "extendedIngredients": Ingredient[],
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
    types?: string, 
    cuisines?: string,
    diets?: string,
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
