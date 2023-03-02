import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {productAPI, ProductObjType} from "../../api/productAPI";
import {ImgUrlType, profileAPI, UploadImgUrlType} from "@/api/profileAPI";
import {StatusType} from "@/components/alert/AlertComponent";
import {ReviewsType} from "@/api/chatAPI";


export type InitialProductStateType = {
    available_hours: string
    created_att: string
    five_star: null
    four_star: null
    gif_url: string
    gif_url_2: string
    gif_url_3: string
    id: number
    locations: { _latitude: number, _longitude: number }
    pickup_time: string
    post_address: string
    post_arranged: boolean
    post_description: string
    post_like_counter: number
    post_metro_station: string
    post_name: string
    post_type: string
    post_published: boolean
    post_views: number
    profile_id:string
    user: string
    reviews:Array<ReviewsType>
}

const initialState = {
    products: [] as Array<InitialProductStateType>,
    currentUserProducts: [] as Array<InitialProductStateType>,
    searchProducts: [] as Array<InitialProductStateType>,
    oneProduct: [] as Array<InitialProductStateType>,
    isUpdateProduct: "info" as StatusType,
    updateProductEffect:false,
    postImgUrl: '',
    isPostImgUpload: false,
    message: '',
    status:"loading",

};

export const getProductsTC = createAsyncThunk("/getProductsTC", async (productType: string, thunkAPI) => {
    try {
        let {data, error} = await productAPI.getProducts(productType);
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }
        return data;
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});

export const getCurrentUserProductsTC = createAsyncThunk('/getCurrentUserProducts', async (userID: string, thunkAPI) => {
    try {
        const {data, error} = await productAPI.getCurrentUserProduct(userID);

        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }

        return data;
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});

export const getOneProductTC = createAsyncThunk('/getOneProductTC', async (productId: number, thunkAPI) => {
    try {
        let {data, error} = await productAPI.getOneProduct(productId);
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }
        return data;
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});

export const createProductTC = createAsyncThunk('/createProductTC', async (productObj: ProductObjType, thunkAPI) => {
    try {
        const {error} = await productAPI.createProduct(productObj)
        if (error) {
            thunkAPI.dispatch(productActions.isUpdateProduct("error"));
            console.log(error)
            return thunkAPI.rejectWithValue(error);
        }
        return {isUpdateProduct: "success" as StatusType, message: "Product is created successful"}
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});

export const deleteProductTC = createAsyncThunk('/deleteProductTC', async (productID: number, thunkAPI) => {
    try {
        const {error} = await productAPI.deleteProduct(productID);
        if (error) {
            thunkAPI.dispatch(productActions.isUpdateProduct("error"));
            console.log(error)
            return thunkAPI.rejectWithValue(error);
        }
        return {isUpdateProduct: "success" as StatusType, message: "Product is deleted successful"}
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});

export const resultsSearchProductsTC = createAsyncThunk('/resultsSearchProductsTC', async (args: {
    searchWord: string,
    productSearchType: string
}, thunkAPI) => {
    try {
        const {data, error} = await productAPI.searchProducts(args.searchWord, args.productSearchType);
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }
        return data;
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});

export const downloadPostImgFromDBTC = createAsyncThunk("/auth/downloadPostImgFromDBTC", async (imgValue: ImgUrlType, thunkAPI) => {
    try {
        const {data, error} = await profileAPI.downloadImgFromDB(imgValue)
        if (error) {
            console.log(error)
            return thunkAPI.rejectWithValue(error);
        }
        if (data) {
            console.log(URL.createObjectURL(data));
            return URL.createObjectURL(data);
        }
    } catch (error: any) {
        console.log('Error downloading image: ', error.message)
    }
})

export const uploadPostImgToDBTC = createAsyncThunk("/auth/uploadPostImgToDBTC", async (imgValue: UploadImgUrlType, thunkAPI) => {
    try {

        const {error} = await profileAPI.uploadImgFromDB(imgValue);
        if (error) {
            console.log(error)
            return thunkAPI.rejectWithValue(error);
        }
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.message);
    }
})
export const updateProductTC = createAsyncThunk("/auth/updateProductTC", async (updates: ProductObjType, thunkAPI) => {
    try {
        let {error} = await productAPI.updateProduct(updates);
        if (error) {
            thunkAPI.dispatch(productActions.isUpdateProduct("error"));
            console.log(error)
            return thunkAPI.rejectWithValue(error);
        }
        return {isUpdateProduct: "success" as StatusType, message: "Product is updated successful"}
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error);
    }
})
const productSlice = createSlice({
    name: "product",
    initialState,
    reducers: {
        isUpdateProduct: (state, action) => {
            state.isUpdateProduct = action.payload;
        },
        clearOneProductState:(state)=>{
            state.oneProduct = []
        }
    },
    extraReducers: (builder) => {
        builder.addCase(getProductsTC.pending, (state) => {
         state.status="loading"
        });
        builder.addCase(getProductsTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.products = action.payload;
                state.status="loaded"
            }
        });
        builder.addCase(getCurrentUserProductsTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.currentUserProducts = action.payload;
            }
        });
        builder.addCase(getOneProductTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.oneProduct = action.payload;
            }
        });
        builder.addCase(createProductTC.fulfilled, (state, action) => {
            state.isUpdateProduct = action.payload.isUpdateProduct;
            state.message = action.payload.message;
            state.updateProductEffect = !state.updateProductEffect;
        });
        builder.addCase(createProductTC.rejected, (state) => {
            state.message = "Something was wrong!"
        });
        builder.addCase(deleteProductTC.fulfilled, (state, action) => {
            state.isUpdateProduct = action.payload.isUpdateProduct;
            state.message = action.payload.message;
            state.updateProductEffect = !state.updateProductEffect;
        });
        builder.addCase(deleteProductTC.rejected, (state) => {
            state.message = "Something was wrong!"
        });
        builder.addCase(updateProductTC.fulfilled, (state, action) => {
            console.log(state.updateProductEffect)
            state.isUpdateProduct = action.payload.isUpdateProduct;
            state.message = action.payload.message;
            state.updateProductEffect = !state.updateProductEffect;
        });
        builder.addCase(updateProductTC.rejected, (state) => {
            state.message = "Something was wrong!"
        });
        builder.addCase(resultsSearchProductsTC.pending, (state) => {
         state.status = "loading"
        });
        builder.addCase(resultsSearchProductsTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.searchProducts = action.payload;
                state.status = "loaded"
            }
        });
        builder.addCase(downloadPostImgFromDBTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.postImgUrl = action.payload
            }
        });
        builder.addCase(uploadPostImgToDBTC.fulfilled, (state) => {
            state.isPostImgUpload = true
        });
        builder.addCase(uploadPostImgToDBTC.rejected, (state) => {
            state.message = "Something was wrong!"
        });
    }
})


export const {reducer: productReducer, actions: productActions} = productSlice;