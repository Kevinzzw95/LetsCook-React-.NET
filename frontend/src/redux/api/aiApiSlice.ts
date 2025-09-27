import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
    baseUrl: "http://localhost:8088/",
})

export const aiApiSlice = createApi({
    reducerPath: 'aiApi',
    baseQuery: baseQuery,
    endpoints: builder => ({})
})

export default aiApiSlice.reducer; 