import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQueryWithReauth } from './baseQueryWithReauth';

export const apiSlice = createApi({
    reducerPath: 'baseApi',
    baseQuery: createBaseQueryWithReauth('http://localhost:5001/api/'),
    tagTypes: ['MealPlan', 'Recipe', 'RecipeList', 'RecipeFacets'],
    endpoints: builder => ({})
})

export default apiSlice.reducer; 
