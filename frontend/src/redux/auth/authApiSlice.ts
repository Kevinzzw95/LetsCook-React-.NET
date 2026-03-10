import { FieldValues } from "react-hook-form";
import { loginRes, postAuth } from "../../types/user";
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
		})
        
    })
})

export const {
	useLoginMutation,
	useUserRegisterMutation
} = authApiSlice