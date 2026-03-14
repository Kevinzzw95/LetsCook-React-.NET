import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store/store";

export interface authSliceState {
    user: string | null;
    token: string | null;
    refreshToken: string | null;
}

const initialState: authSliceState = { user: null, token: null, refreshToken: null };

const authSlice = createSlice({
    name: 'auth',
    initialState: initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<authSliceState>) => {
            const{ user, token, refreshToken } = action.payload;
            state.user = user;
            state.token = token;
            state.refreshToken = refreshToken ?? state.refreshToken;

            localStorage.setItem('user', JSON.stringify({
                user: state.user,
                token: state.token,
                refreshToken: state.refreshToken
            }));
        },
        logOut: (state) => {
            state.user = null; 
            state.token = null;
            state.refreshToken = null;

            localStorage.removeItem('user');
        }
    }
})

export const { setCredentials, logOut } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token;
