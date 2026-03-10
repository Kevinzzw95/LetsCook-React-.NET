import { configureStore } from "@reduxjs/toolkit";
import apiReducer, { apiSlice } from "../api/apiSlice";
import userReducer from '../user/userSlice'
import authReducer from '../auth/authSlice'
import aiApiReducer, { aiApiSlice } from "../api/aiApiSlice";

const savedAuth = localStorage.getItem('user');

const preloadedState = {
  auth: savedAuth ? JSON.parse(savedAuth) : undefined
};

export const store = configureStore({
    reducer: {
        baseApi: apiReducer,
        user: userReducer,
        auth: authReducer,
        aiApi: aiApiReducer
    },
    preloadedState,
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware().concat(apiSlice.middleware, aiApiSlice.middleware),
        devTools: true
})

export type RootState = ReturnType<typeof store['getState']>

export type AppDispatch = typeof store['dispatch']

if (process.env.NODE_ENV !== 'production') {
  window.store = store;
}