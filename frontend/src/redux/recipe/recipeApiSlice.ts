import { FieldValues } from "react-hook-form";
import { recipeCommon } from "../../types/recipe"
import { apiSlice } from "../api/apiSlice"

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
    }),
})

function fieldValuesToFormData(values: FieldValues): FormData {
    const formData = new FormData();
  
    for (const key in values) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        const value = values[key];
  
        // Handle arrays and files if needed
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            formData.append(`${key}[${index}]`, item);
          });
        } else if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value);
        }
      }
    }
  
    return formData;
}

function createFormData(item: FieldValues) {
    const formData = new FormData();
    for (const key in item) {
        if(key === 'images') {
            item[key].forEach((file: File) => {
                formData.append("images", file);
            });
        } else {
            formData.append(key, item[key]);
        }
    }
    return formData;
}

export const { useGetRecipeQuery, useCreateRecipeMutation } = recipeApiSlice; 