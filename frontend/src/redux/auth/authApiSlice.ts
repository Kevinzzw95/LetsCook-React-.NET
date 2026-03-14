import { FieldValues } from "react-hook-form";
import { loginRes, postAuth, UpdateProfilePayload } from "../../types/user";
import { apiSlice } from "../api/apiSlice";

export const authApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        login: builder.mutation<loginRes, postAuth>({
			query: credentials => ({
				url: 'account/login/',
				method: 'POST',
				body: {...credentials}
			})
        }),
		userRegister: builder.mutation<loginRes, FieldValues>({
			query: registerData => ({
              url: "account/register/",
              method: 'POST',
              body: {...registerData}  
            }),
		}),
        getCurrentUser: builder.query<loginRes, void>({
            query: () => ({
                url: 'account/currentUser/',
                method: 'GET'
            })
        }),
        updateProfile: builder.mutation<loginRes, UpdateProfilePayload>({
            query: payload => ({
                url: 'account/profile/',
                method: 'PUT',
                body: payload
            })
        })
        
    })
})

export const {
	useLoginMutation,
	useUserRegisterMutation,
    useGetCurrentUserQuery,
    useUpdateProfileMutation
} = authApiSlice
