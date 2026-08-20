import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { RootState } from '../store/store';
import { logOut, setCredentials } from '../auth/authSlice';
import type { AuthResponse } from '../../types/user';

const MAIN_API_BASE_URL = 'http://localhost:5001/api/';

const prepareHeaders = (headers: Headers, { getState }: { getState: () => unknown }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
};

export const createBaseQueryWithReauth = (
    baseUrl: string
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> => {
    const serviceQuery = fetchBaseQuery({ baseUrl, credentials: 'include', prepareHeaders });
    const mainApiQuery = fetchBaseQuery({ baseUrl: MAIN_API_BASE_URL, credentials: 'include', prepareHeaders });

    return async (args, api, extraOptions) => {
        let result = await serviceQuery(args, api, extraOptions);
        if (result.error?.status !== 401) return result;

        const state = api.getState() as RootState;
        const refreshToken = state.auth.refreshToken;
        if (!refreshToken) {
            api.dispatch(logOut());
            return result;
        }

        const refreshResult = await mainApiQuery({
            url: 'account/refresh',
            method: 'POST',
            body: { refreshToken }
        }, api, extraOptions);

        if (refreshResult.error || !refreshResult.data) {
            api.dispatch(logOut());
            return result;
        }

        const auth = refreshResult.data as AuthResponse;
        api.dispatch(setCredentials({
            user: auth.username ?? state.auth.user,
            token: auth.token,
            refreshToken: auth.refreshToken ?? refreshToken
        }));
        result = await serviceQuery(args, api, extraOptions);
        return result;
    };
};
