import { FieldValues } from "react-hook-form";
import { recipeCommon, RecipeDraft } from "../../types/recipe"
import { apiSlice } from "../api/apiSlice"
import { ShoppingItem, ShoppingList, updateShoppingItemPayload } from "../../types/ingredient";

export const recipeApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getRecipe: builder.query<recipeCommon, number>({
            query: (id) => ({ url: `recipe/${id}` }),
        }),
        createRecipe: builder.mutation<recipeCommon, FieldValues>({
            query: recipe => ({
				url: "recipe/",
				method: 'POST',
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
		})
    }),
})

function createFormData(item: FieldValues) {
    const formData = new FormData();
    for (const key in item) {
        if(key === 'images') {
            item[key].forEach((file: File) => {
                formData.append("images", file);
            });
        } else if(key === 'ingredients' || key === 'steps') {
			formData.append(key, JSON.stringify(item[key]));
		} else {
            formData.append(key, item[key]);
        }
    }
    return formData;
}

export const { useGetRecipeQuery, useCreateRecipeMutation, useAddItemsToShoppingListMutation, useGetShoppingListQuery,  useUpdateShoppingItemMutation } = recipeApiSlice; 