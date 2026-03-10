import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../store/store';
import { userSliceState } from '../../types/user';

const initialState: userSliceState = { username: "", email: ""};

const userSlice = createSlice({
    name: "user",
    initialState: initialState,
    reducers: {
        setUserInfo(state, action: PayloadAction<userSliceState>) {
            const{ username, email } = action.payload;
            state.username = username;
            state.email = email;
        },
    }
});

export const { setUserInfo } = userSlice.actions;

export default userSlice.reducer;

export const getUserName = (state: RootState) => state.user.username;
export const getEmail = (state: RootState) => state.user.email;