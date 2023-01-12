import {createAsyncThunk, createSlice, SerializedError} from "@reduxjs/toolkit";
import {AuthPayload, profileAPI} from "../../api/profileAPI";
import {AuthApiError, AuthError, Session, User} from "@supabase/supabase-js";
import {supabase} from "../../supaBase.config";
import {Simulate} from "react-dom/test-utils";
import error = Simulate.error;
import {isAuthError} from "@supabase/gotrue-js/src/lib/errors";


const initialState = {
    login: {} as User,
    registration: {} as User,
    user: {} as User,
    isRegister: false,
    isAuth: false,
    session: {
        user: {
            user_metadata: {}
        }
    } as Session,
    isLoading: false,
    error: null

};
export const loginTC = createAsyncThunk("/auth/loginTC", async ({email, password}: AuthPayload, thunkAPI) => {
    try {
        //const {data, error} = await supabase.auth.signInWithOtp({email})
        const {data, error} = await profileAPI.loginWithPass(email, password)
        if (error) throw error
        return data.user
    } catch (e: any) {
        return thunkAPI.rejectWithValue(e)
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
        if (error) throw error
        console.log(data.user)
        return data.user
    } catch (e: any) {
        console.log(e)
    }
});

export const logoutTC = createAsyncThunk("/auth/logoutTC", async (arg, thunkAPI) => {
    try {
        const {error} = await profileAPI.logOut()
        if (error) throw error
    } catch (e) {
        console.log(e)
    }
});

const userSlice = createSlice({
    name: "user",
    initialState: initialState,
    reducers: {
        getSession:(state, action)=>{
            if (action.payload) {
                state.isRegister = true
                state.isAuth=true
                state.session = action.payload
            }
        }
    },
    extraReducers: (builder) => {
        builder.addCase(loginTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.isAuth = true
                state.isRegister = true
                state.login = action.payload
                state.error = null
            }
        });
        builder.addCase(loginTC.rejected, (state, action) => {
            // @ts-ignore
            state.error = action.payload.message
        });
        builder.addCase(registerTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.isRegister = true
                state.registration = action.payload
            }
        });

        builder.addCase(logoutTC.fulfilled, (state) => {
            state.isAuth = false;
            state.isRegister = false;
        });
    }
});
export const {getSession} = userSlice.actions
export const userReducer = userSlice.reducer;