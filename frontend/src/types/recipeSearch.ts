import { recipeCommon } from "./recipe";

export interface RecipeSearchParams {
    pageNumber?: number;
    pageSize?: number;
    query?: string;
    type?: string;
    cuisine?: string;
    diet?: string;
}

export interface RecipeSearchResponse {
    items: recipeCommon[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

export interface RecipeFacetResponse {
    totalCount: number;
    type: Record<string, number>;
    cuisine: Record<string, number>;
    diet: Record<string, number>;
}
