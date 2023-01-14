import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {AuthPayload, GetValueType, ImgUrlType, profileAPI, UploadImgUrlType} from "../../api/profileAPI";
import {Session, User} from "@supabase/supabase-js";


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
    error: null,
    value: null,
    imgUrl: ''
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

export const getValueFromDBTC = createAsyncThunk("/auth/getValueFromDBTC", async ({
                                                                                      fromTableName,
                                                                                      columnValue,
                                                                                      columnValueItem,
                                                                                      selectRow
                                                                                  }: GetValueType, thunkAPI) => {
    try {
        thunkAPI.dispatch(isLoading(true))
        let {data, error, status} = await profileAPI.getValue({fromTableName, columnValue, columnValueItem, selectRow})
        if (error && status !== 406) {
            throw error
        }
        if (data) {
            console.log(data)
            //console.log(status)
            return data
        }
    } catch (error: any) {
        alert(error.message)
    } finally {
        thunkAPI.dispatch(isLoading(false))
    }
});
export const downloadImgFromDBTC = createAsyncThunk("/auth/downloadImgFromDBTC", async (imgValue: ImgUrlType, thunkAPI) => {
    try {
        const {data, error} = await profileAPI.downloadImgFromDB(imgValue)
        if (error) {
            throw error
        }
        const url = URL.createObjectURL(data)
        console.log(url)
        return url
    } catch (error: any) {
        console.log('Error downloading image: ', error.message)
    }
})
export const uploadImgFromDBTC = createAsyncThunk("/auth/uploadImgFromDBTC", async (imgValue: UploadImgUrlType, thunkAPI) => {
    try {
        const {error} = await profileAPI.uploadImgFromDB(imgValue)
        if (error) {
            throw error
        }
    } catch (error: any) {
        thunkAPI.rejectWithValue(error.message)
    }
})

const userSlice = createSlice({
    name: "user",
    initialState: initialState,
    reducers: {
        getSession: (state, action) => {
            if (action.payload) {
                state.isRegister = true
                state.isAuth = true
                state.session = action.payload
            }
        },
        isLoading: (state, action) => {
            state.isLoading = action.payload
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
        builder.addCase(getValueFromDBTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.value = action.payload
            }
        });
        builder.addCase(downloadImgFromDBTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.imgUrl = action.payload
            }
        });
        builder.addCase(uploadImgFromDBTC.fulfilled, (state) => {

        });

        builder.addCase(logoutTC.fulfilled, (state) => {
            state.isAuth = false;
            state.isRegister = false;
        });
    }
});
export const {getSession, isLoading} = userSlice.actions
export const userReducer = userSlice.reducer;