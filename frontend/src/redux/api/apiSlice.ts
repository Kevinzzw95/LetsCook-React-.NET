import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store/store';
import { logOut, setCredentials } from '../auth/authSlice';
import type {
    BaseQueryFn
} from '@reduxjs/toolkit/query'
import { AuthResponse } from '../../types/user';

const baseQuery = fetchBaseQuery({
    baseUrl: 'http://localhost:5000/api/',
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.token;
        if(token) {
            headers.set("authorization", `Bearer ${token}`);
        }
        return headers;
    }
})

const baseQueryWithReauth: BaseQueryFn = async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);

    if (result?.error?.status === 401) {
        console.log('sending refresh token');
        const refreshToken = (api.getState() as RootState).auth.refreshToken;
        // send refresh token to get new access token 
        const refreshResult = await baseQuery({
            url: '/auth/refresh',
            method: 'POST',
            body: { refreshToken }
        }, api, extraOptions);
        console.log(refreshResult)
        if (refreshResult?.data) {
            const data = refreshResult.data as AuthResponse;
            const user = (api.getState() as RootState).auth.user;
            // store the new token 
            api.dispatch(setCredentials({ token: data.token, refreshToken, user }));
            // retry the original query with new access token 
            result = await baseQuery(args, api, extraOptions);
        } else {
            api.dispatch(logOut());
        }
    }

    return result;
}

export const apiSlice = createApi({
    reducerPath: 'baseApi',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['MealPlan'],
    endpoints: builder => ({})
})

export default apiSlice.reducer; 