import { configureStore } from "@reduxjs/toolkit";
import apiReducer, { apiSlice } from "../api/apiSlice";
import userReducer from '../user/userSlice'
import authReducer from '../auth/authSlice'
import aiApiReducer, { aiApiSlice } from "../api/aiApiSlice";

export const store = configureStore({
    reducer: {
        baseApi: apiReducer,
        user: userReducer,
        auth: authReducer,
        aiApi: aiApiReducer
    },
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware().concat(apiSlice.middleware, aiApiSlice.middleware),
        devTools: true
})

export type RootState = ReturnType<typeof store['getState']>

export type AppDispatch = typeof store['dispatch']