import { FieldValues } from "react-hook-form";
import { recipeCommon } from "../../types/recipe"
import { apiSlice } from "../api/apiSlice"
import { ShoppingItem, ShoppingList, updateShoppingItemPayload } from "../../types/ingredient";
import { AddMealPlanDaysToShoppingListPayload, AddMealPlanDaysToShoppingListResult, MealPlanEntry, MealPlanRecipeOption, MealPlanUpsertPayload } from "../../types/mealPlan";
import { RecipeFacetResponse, RecipeSearchParams, RecipeSearchResponse } from "../../types/recipeSearch";

type RecipeApiResponse = Partial<recipeCommon> & {
    cuisines?: string | string[];
    diet?: string;
    diets?: string | string[];
    type?: string;
    dishType?: string | string[];
    dishTypes?: string | string[];
    imageUrls?: string[];
};

type RecipeSearchApiResponse = Omit<RecipeSearchResponse, 'items'> & {
    items?: RecipeApiResponse[];
};

const mapRecipeResponse = (recipe: RecipeApiResponse): recipeCommon => ({
    ...recipe,
    cuisine: recipe.cuisine ?? recipe.cuisines ?? '',
    diet: Array.isArray(recipe.diets) ? recipe.diets[0] ?? '' : recipe.diet ?? '',
    type: recipe.type ?? recipe.dishType ?? (Array.isArray(recipe.dishTypes) ? recipe.dishTypes[0] : recipe.dishTypes) ?? '',
    imageUrls: recipe.imageUrls ?? []
});

export const recipeApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getRecipes: builder.query<MealPlanRecipeOption[], void>({
            query: () => ({ url: 'recipe' }),
            providesTags: ['RecipeList']
        }),
        searchRecipes: builder.query<RecipeSearchResponse, RecipeSearchParams>({
            query: ({ pageNumber = 1, pageSize = 12, query, type, cuisine, diet }) => {
                const params = new URLSearchParams({
                    pageNumber: pageNumber.toString(),
                    pageSize: pageSize.toString()
                });

                if (query) params.set('query', query);
                if (type) params.set('type', type);
                if (cuisine) params.set('cuisine', cuisine);
                if (diet) params.set('diet', diet);

                return { url: `recipe/search?${params.toString()}` };
            },
            transformResponse: (response: RecipeSearchApiResponse): RecipeSearchResponse => ({
                ...response,
                items: (response.items ?? []).map(mapRecipeResponse)
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.items.map((recipe) => ({ type: 'Recipe' as const, id: recipe.id })),
                        'RecipeList'
                    ]
                    : ['RecipeList']
        }),
        getRecipeFacets: builder.query<RecipeFacetResponse, Omit<RecipeSearchParams, 'pageNumber' | 'pageSize'>>({
            query: ({ query, type, cuisine, diet }) => {
                const params = new URLSearchParams();
                if (query) params.set('query', query);
                if (type) params.set('type', type);
                if (cuisine) params.set('cuisine', cuisine);
                if (diet) params.set('diet', diet);

                const suffix = params.toString();
                return { url: `recipe/facets${suffix ? `?${suffix}` : ''}` };
            },
            providesTags: ['RecipeFacets']
        }),
        getRecipe: builder.query<recipeCommon, number>({
            query: (id) => ({ url: `recipe/${id}` }),
            transformResponse: mapRecipeResponse,
            providesTags: (_result, _error, id) => [{ type: 'Recipe', id }]
        }),
        createRecipe: builder.mutation<number, FieldValues>({
            query: recipe => ({
				url: "recipe/",
				method: 'POST',
				body: createFormData(recipe),
            }),
            invalidatesTags: ['RecipeList', 'RecipeFacets']
        }),
        updateRecipe: builder.mutation<number, { id: number; recipe: FieldValues }>({
            query: ({ id, recipe }) => ({
                url: `recipe/${id}`,
                method: 'PUT',
                body: createFormData(recipe),
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Recipe', id },
                'RecipeList',
                'RecipeFacets'
            ]
        }),
        deleteRecipe: builder.mutation<void, number>({
            query: (id) => ({
                url: `recipe/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'Recipe', id },
                'RecipeList',
                'RecipeFacets'
            ]
        }),
        addItemsToShoppingList: builder.mutation<ShoppingItem, FieldValues>({
            query: shoppingList => ({
				url: "shoppingList/",
				method: 'POST',
				body: createFormData(shoppingList),
            })
        }),
		getShoppingList: builder.query<ShoppingList, void>({
            query: () => 'shoppingList'
        }),
		updateShoppingItem: builder.mutation<ShoppingItem, updateShoppingItemPayload>({
			query: ({ itemId, amount, unit, store, isBought }) => ({
				url: `/shoppingList/${itemId}`,
				method: "PUT",
				body: {
					amount,
					unit,
					store,
					isBought
				}
			})
		}),
        getMealPlanEntries: builder.query<MealPlanEntry[], { year: number; month: number }>({
            query: ({ year, month }) => ({ url: `mealPlan?year=${year}&month=${month}` }),
            providesTags: ['MealPlan']
        }),
        upsertMealPlanEntry: builder.mutation<MealPlanEntry, MealPlanUpsertPayload>({
            query: mealPlanEntry => ({
                url: 'mealPlan',
                method: 'POST',
                body: mealPlanEntry
            }),
            invalidatesTags: ['MealPlan']
        }),
        deleteMealPlanEntry: builder.mutation<void, number>({
            query: id => ({
                url: `mealPlan/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['MealPlan']
        }),
        addMealPlanDaysToShoppingList: builder.mutation<AddMealPlanDaysToShoppingListResult, AddMealPlanDaysToShoppingListPayload>({
            query: payload => ({
                url: 'shoppingList/meal-plan-days',
                method: 'POST',
                body: payload
            })
        }),
        addRecipeIngredientsToShoppingList: builder.mutation<AddMealPlanDaysToShoppingListResult, number>({
            query: recipeId => ({
                url: `shoppingList/recipe/${recipeId}`,
                method: 'POST'
            })
        })
    }),
})

function createFormData(item: FieldValues) {
    const formData = new FormData();
    for (const key in item) {
        if(key === 'images') {
            const existingImageUrls = item[key]
                .filter((file: File | string) => typeof file === 'string');
            formData.append("existingImageUrls", JSON.stringify(existingImageUrls));
            item[key].forEach((file: File | string) => {
                if (file instanceof File) {
                    formData.append("images", file);
                }
            });
        } else if(key === 'ingredients' || key === 'steps') {
			formData.append(key, JSON.stringify(item[key]));
		} else if (key === 'type') {
            formData.append('dishType', item[key] ?? '');
        } else if (key === 'cuisine') {
            formData.append('cuisine', item[key] ?? '');
        } else if (key === 'diet') {
            if (item[key]) {
                formData.append('diets', item[key]);
            }
		} else {
            formData.append(key, item[key]);
        }
    }
    return formData;
}

export const {
    useGetRecipesQuery,
    useSearchRecipesQuery,
    useGetRecipeFacetsQuery,
    useGetRecipeQuery,
    useCreateRecipeMutation,
    useUpdateRecipeMutation,
    useDeleteRecipeMutation,
    useAddItemsToShoppingListMutation,
    useGetShoppingListQuery,
    useUpdateShoppingItemMutation,
    useGetMealPlanEntriesQuery,
    useUpsertMealPlanEntryMutation,
    useDeleteMealPlanEntryMutation,
    useAddMealPlanDaysToShoppingListMutation,
    useAddRecipeIngredientsToShoppingListMutation
} = recipeApiSlice; 
