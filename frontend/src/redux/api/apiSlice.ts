import { MAIN_API_BASE_URL } from '../../config/environment';
import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQueryWithReauth } from './baseQueryWithReauth';

export const apiSlice = createApi({
    reducerPath: 'baseApi',
    baseQuery: createBaseQueryWithReauth(MAIN_API_BASE_URL),
    tagTypes: ['MealPlan', 'Recipe', 'RecipeList', 'RecipeFacets'],
    endpoints: () => ({})
})

export default apiSlice.reducer; 
