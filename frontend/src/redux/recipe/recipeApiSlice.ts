import { FieldValues } from "react-hook-form";
import { recipeCommon, RecipeDraft } from "../../types/recipe"
import { apiSlice } from "../api/apiSlice"
import { ShoppingItem, ShoppingList, updateShoppingItemPayload } from "../../types/ingredient";
import { AddMealPlanDaysToShoppingListPayload, AddMealPlanDaysToShoppingListResult, MealPlanEntry, MealPlanRecipeOption, MealPlanUpsertPayload } from "../../types/mealPlan";

export const recipeApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getRecipes: builder.query<MealPlanRecipeOption[], void>({
            query: () => ({ url: 'recipe' })
        }),
        getRecipe: builder.query<recipeCommon, number>({
            query: (id) => ({ url: `recipe/${id}` }),
        }),
        createRecipe: builder.mutation<number, FieldValues>({
            query: recipe => ({
				url: "recipe/",
				method: 'POST',
				body: createFormData(recipe),
            }),
        }),
        updateRecipe: builder.mutation<number, { id: number; recipe: FieldValues }>({
            query: ({ id, recipe }) => ({
                url: `recipe/${id}`,
                method: 'PUT',
                body: createFormData(recipe),
            }),
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
		} else {
            formData.append(key, item[key]);
        }
    }
    return formData;
}

export const {
    useGetRecipesQuery,
    useGetRecipeQuery,
    useCreateRecipeMutation,
    useUpdateRecipeMutation,
    useAddItemsToShoppingListMutation,
    useGetShoppingListQuery,
    useUpdateShoppingItemMutation,
    useGetMealPlanEntriesQuery,
    useUpsertMealPlanEntryMutation,
    useDeleteMealPlanEntryMutation,
    useAddMealPlanDaysToShoppingListMutation,
    useAddRecipeIngredientsToShoppingListMutation
} = recipeApiSlice; 
