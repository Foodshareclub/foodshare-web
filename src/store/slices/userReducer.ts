import {createAsyncThunk, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {
    AllValuesType,
    AuthPayload,
    GetValueType,
    ImgUrlType,
    profileAPI,
    ProviderType,
    UploadImgUrlType
} from "../../api/profileAPI";
import {Session, User} from "@supabase/supabase-js";
import {supabase} from "../../supaBase.config";
import {FulfilledAction} from "@reduxjs/toolkit/dist/query/core/buildThunks";
import {Simulate} from "react-dom/test-utils";
import error = Simulate.error;


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
    value: {} as AllValuesType,
    imgUrl: '',
    isUpdate: false,
    language: "en"
};

export const loginTC = createAsyncThunk("/auth/loginTC", async ({email, password}: AuthPayload, thunkAPI) => {
    try {
        const {data,error} = await profileAPI.loginWithPass(email, password)
        if (error) console.error(error)
        return data.user
    } catch (e: any) {
        console.log(e)
       return thunkAPI.rejectWithValue(e.message)
    }
});

export const loginWithOtpTC = createAsyncThunk("/auth/loginWithOtpTC", async (email: string, thunkAPI) => {
    try {
        const {data, error} = await supabase.auth.signInWithOtp({email});
        console.log(error)
        return data.user
    } catch (e: any) {
        return thunkAPI.rejectWithValue(e)
    }
});

export const signInWithProviderTC = createAsyncThunk("/auth/signInWithGoogleTC", async (provider: ProviderType, thunkAPI) => {
    try {
        const {data, error} = await profileAPI.signInWithProvider(provider);
        console.log(error)
        return data
    } catch (e: any) {
        return thunkAPI.rejectWithValue(e)
    }
});

export const loginWithPhoneOtpTC = createAsyncThunk("/auth/loginWithPhoneOtpTC", async ({
                                                                                            phone,
                                                                                            password
                                                                                        }: AuthPayload, thunkAPI) => {
    try {
        const {data, error} = await profileAPI.loginWithPhone(phone as string, password);

        // return data.user
    } catch (e: any) {
        return thunkAPI.rejectWithValue(e)
    }
});

export const registerTC = createAsyncThunk("/auth/registerTC", async ({
                                                                          email,
                                                                          password,
                                                                          firstName,
                                                                          lastName
                                                                      }: AuthPayload) => {
    try {
        const {data, error} = await profileAPI.registration({email, password, firstName, lastName})
        console.log(error)
        return data.user
    } catch (e: any) {
        console.log(e)
    }
});

export const logoutTC = createAsyncThunk("/auth/logoutTC", async () => {
    try {
        const {error} = await profileAPI.logOut()
        console.error(error)
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
        thunkAPI.dispatch(userActions.isLoading(true))
        let {data, error, status} = await profileAPI.getValue({fromTableName, columnValue, columnValueItem, selectRow})
        if (error && status !== 406) {
            console.log(error)
        }
        if (data) {
            return data
        }
    } catch (error: any) {
        alert(error.message)
    } finally {
        thunkAPI.dispatch(userActions.isLoading(false))
    }
});

export const downloadImgFromDBTC = createAsyncThunk("/auth/downloadImgFromDBTC", async (imgValue: ImgUrlType) => {
    try {
        const {data, error} = await profileAPI.downloadImgFromDB(imgValue)
        if (error) {
            console.log(error)
        }
        if (data){
            return URL.createObjectURL(data)
        }
    } catch (error: any) {
        console.log('Error downloading image: ', error.message)
    }
})

export const uploadImgToDBTC = createAsyncThunk("/auth/uploadImgToDBTC", async (imgValue: UploadImgUrlType, thunkAPI) => {
    try {

        const {error} = await profileAPI.uploadImgFromDB(imgValue)
        if (error) {
            console.log(error)
        }
    } catch (error: any) {
        thunkAPI.rejectWithValue(error.message)
    } finally {
        thunkAPI.dispatch(userActions.isUpdate())
    }
})

export const updateProfileTC = createAsyncThunk("/auth/updateProfileTC", async (updates: AllValuesType, thunkAPI) => {
    try {
        thunkAPI.dispatch(userActions.isLoading(true))
        let {error} = await profileAPI.updateProfile(updates)
        if (error) {
            console.log(error)
        }
    } catch (error: any) {
        thunkAPI.rejectWithValue(error.message)
    } finally {
        thunkAPI.dispatch(userActions.isLoading(false))
    }
})

export const recoveryPasswordTC = createAsyncThunk("/auth/recoveryPasswordTC", async (email: string, thunkAPI) => {
    try {
        const { data, error } = await profileAPI.recoveryPassword(email);
        if (error) {
            console.error(error)
        }

        return data;
    }catch (e: any) {
        thunkAPI.rejectWithValue(e.message)
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
        },
        isUpdate: (state) => {
            state.isUpdate = !state.isUpdate
        },
        changeLanguage: (state, action: PayloadAction<string>) => {
            state.language = action.payload
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
        builder.addCase(signInWithProviderTC.fulfilled, (state, action) => {
            console.log(action.payload)
        });
        builder.addCase(loginWithOtpTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.isAuth = true
                state.isRegister = true
                state.login = action.payload
                state.error = null
            }
        });
        builder.addCase(registerTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.isRegister = true
                state.registration = action.payload
            }
        });
        builder.addCase(getValueFromDBTC.fulfilled, (state, action: PayloadAction<any, string, { arg: GetValueType; requestId: string; requestStatus: "fulfilled"; }, never>) => {
            if (action.payload) {
                state.value = action.payload
            }
        });
        builder.addCase(downloadImgFromDBTC.fulfilled, (state, action: PayloadAction<string | undefined, string, { arg: ImgUrlType; requestId: string; requestStatus: "fulfilled"; }, never>) => {
            if (action.payload) {
                if (action.payload) {
                    state.imgUrl = action.payload
                }
            }
        });
        builder.addCase(uploadImgToDBTC.fulfilled, (state) => {
            state.error = null

        });
        builder.addCase(updateProfileTC.fulfilled, (state) => {
            state.error = null
        });

        builder.addCase(logoutTC.fulfilled, (state) => {
            state.isAuth = false;
            state.isRegister = false;
            state.error = null
            state.value = {} as AllValuesType
            state.login = {} as User
            state.registration = {} as User
            state.imgUrl = ''
        });
        builder.addCase(recoveryPasswordTC.fulfilled, (state, action) =>{
            console.log(action.payload);
        })
    }
});
export const {reducer:userReducer,actions:userActions} = userSlice
