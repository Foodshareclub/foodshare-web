import {combineReducers, configureStore} from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import {userReducer} from "./slices/userReducer";
import {productReducer} from "./slices/foodReducer";

export type StateAppType = ReturnType<typeof reducersBox>
const reducersBox = combineReducers({
    user: userReducer,
    product: productReducer
})
const store = configureStore({
    reducer: reducersBox,
    middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(thunk)
})

export type AppDispatch = typeof store.dispatch

export default store
export type RootState = ReturnType<typeof store.getState>