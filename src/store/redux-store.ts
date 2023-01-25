import {combineReducers, configureStore} from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import {userReducer} from "./slices/userReducer";
import {productReducer} from "./slices/productReducer";

export type StateAppType = ReturnType<typeof reducersBox>
const reducersBox = combineReducers({
    user: userReducer,
    product: productReducer
})
const store = configureStore({
    reducer: reducersBox,
    middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(thunk)
})

export default store
// export type RootState = ReturnType<typeof  store.getState>