import { RecipeDraft } from "../../types/recipe";
import { aiApiSlice } from "../api/aiApiSlice";

export const recipeAiApiSlice = aiApiSlice.injectEndpoints({
    endpoints: builder => ({
        uploadImages: builder.mutation<RecipeDraft, File[]>({
            query: (files) => {
                const formData = new FormData();
                files.forEach((file, index) => {
                    formData.append('images', file);
                });
        
                return {  
                    url: 'generateRecipeImages',
                    method: 'POST',
                    body: formData,
                };
            },
        }),
        
        createRecipeByUrl: builder.mutation<RecipeDraft, string>({
            query: (recipeUrl) => {
        
                return {  
                    url: 'generateRecipeUrl',
                    method: 'POST',
                    body: { url: recipeUrl },
                };
            },
        }),
    }),
})

export const { useUploadImagesMutation, useCreateRecipeByUrlMutation } = recipeAiApiSlice; 