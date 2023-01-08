import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {AuthPayload, profileAPI} from "../../api/profileAPI";
import {User} from "@supabase/supabase-js";


const initialState = {
    login: {} as User,
    registration: {} as User,
    isRegister: false,
    isAuth: false

};
export const loginTC = createAsyncThunk("/auth/loginTC", async ({email, password}: AuthPayload, thunkAPI) => {
    try {
        const {data, error} = await profileAPI.loginWithPass(email, password)
        console.log(data)
        // console.log(error)
        if (error) throw error
        return data.user
    } catch (e: any) {
        console.log(e)
        // if (e.response.data.message) {
        //     return thunkAPI.rejectWithValue(e.response.data.message);
        // } else {
        //     return thunkAPI.rejectWithValue(e.response.data[0].msg);
        // }
    }
});
export const registerTC = createAsyncThunk("/auth/registerTC", async ({
                                                                          email,
                                                                          password,
                                                                          firstName,
                                                                          lastName
                                                                      }: AuthPayload, thunkAPI) => {
    try {
        const {data, error} = await profileAPI.registration({email, password, firstName, lastName})
        console.log(data.user)
        // console.log(error)
        return data.user
    } catch (e: any) {
        console.log(e)
    }
});

export const logoutTC = createAsyncThunk("/auth/logoutTC", async (arg, thunkAPI) => {
    try {
        const {error} = await profileAPI.logOut()
        console.log(error)
        return error
    } catch (e) {
        console.log(e)
    }
    await thunkAPI.dispatch(logoutAC());
});


const userSlice = createSlice({
    name: "user",
    initialState: initialState,
    reducers: {
        logoutAC(state) {
            state.login = {} as User
            state.isAuth = false;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(loginTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.isAuth = true
                state.login = action.payload
            }
        });
        builder.addCase(registerTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.isRegister = true
                state.registration = action.payload
            }
        });

    }
});


export const {logoutAC} = userSlice.actions;
export const userReducer = userSlice.reducer;