
import { userSliceState } from "../../types/user";
import { apiSlice } from "../api/apiSlice";


export const userApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getUserData: builder.query<userSliceState, void>({
            query: () => '/profile/',
        }),
        postMovie: builder.mutation<void, Record<string, unknown>>({
			query: updateInfo => ({
				url: '/profile/',
				method: 'POST',
				body: {...updateInfo}
			}) 
        })
    })
})

export const {
    useGetUserDataQuery,
    usePostMovieMutation
} = userApiSlice
