import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {AuthPayload, profileAPI, registrationAPI} from "../../api/profileAPI";
// import {supabase} from "../../supaBase.config";


const initialState = {
    login: {},
    registration: {},
    isRegister: false,
    isAuth: false

};
export const loginTC = createAsyncThunk("/auth/loginTC", async ({email, password}: AuthPayload, thunkAPI) => {
    // const {data, error} = await supabase
    //     .from('users')
    //     .select()
    //     .match({email})
    //     .single();
    // console.log(data)
    // console.log(error)


    try {
        // const {data} = await profileAPI.login(email, password);

        // return data;
    } catch (e: any) {
        // if (e.response.data.message) {
        //     return thunkAPI.rejectWithValue(e.response.data.message);
        // } else {
        //     return thunkAPI.rejectWithValue(e.response.data[0].msg);
        // }
    }
});
export const registerTC = createAsyncThunk("/auth/registerTC", async ({email, password}: AuthPayload, thunkAPI) => {
    // const {status, error} = await supabase
    //     .from('users')
    //     .insert({
    //         email, password,
    //     });
    // console.log(status)
    // console.log(error)

    try {
        // const { data } = await registrationAPI.registration(email,password);

        // return data;
    } catch (e: any) {
        // if (e.response.data.message) {
        //   return thunkAPI.rejectWithValue(e.response.data.message);
        // } else {
        //   return thunkAPI.rejectWithValue(e.response.data[0].msg);
        // }
    }
});

export const logoutTC = createAsyncThunk("/auth/logoutTC", async (arg, thunkAPI) => {

    await thunkAPI.dispatch(logoutAC());
});


const userSlice = createSlice({
    name: "user",
    initialState: initialState,
    reducers: {
        logoutAC(state) {
            state.login = {}
            state.isAuth = false;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(loginTC.fulfilled, (state, action) => {
                state.isAuth = true
                // state.login = action.payload

        });
        builder.addCase(registerTC.fulfilled, (state, action) => {
            // if (action.payload) {
                state.isRegister = true
                // state.login = action.payload
            // }
        });

    }
});


export const {logoutAC} = userSlice.actions;
export const userReducer = userSlice.reducer;