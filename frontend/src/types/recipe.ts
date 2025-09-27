import { ingredient } from "./ingredient"
import { instruction } from "./instruction";
import { SearchItem } from "./searchItem";

export interface recipeCommon {
    "id"?: string,
    "title": string,
    "image": string,
    "imageType": string,
    "servings": number,
    "readyInMinutes"?: number,
    "cookingMinutes"?: number,
    "preparationMinutes"?: number,
    "sourceName": string,
    "sourceUrl": string,
    "healthScore": number,
    "cuisines": string[],
    "dairyFree": boolean,
    "diets": string[],
    "glutenFree": boolean,
    "instructions": instruction[],
    "ketogenic": boolean,
    "lowFodmap": boolean,
    "occasions": string[],
    "sustainable": boolean,
    "vegan": boolean,
    "vegetarian": boolean,
    "veryHealthy": boolean,
    "veryPopular": boolean,
    "dishTypes": string[],
    "extendedIngredients": ingredient[],
    "summary": string
}

export interface recipeSearchRes {
    results: SearchItem[],
    offset: number,
    number: number,
    totalResults: number
}

export interface importedRecipe {
    title: string,
    ingredients: ingredient[],
    steps: string[],
    servings: number,
    sourceName: string,
    images: File[]
}