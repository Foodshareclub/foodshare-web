import {combineReducers, configureStore} from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import {userReducer} from "./slices/userReducer";
import {productReducer} from "./slices/productReducer";
import {chatReducer} from "@/store/slices/chatReducer";

export type StateAppType = ReturnType<typeof reducersBox>
const reducersBox = combineReducers({
    user: userReducer,
    product: productReducer,
    chat:chatReducer
})
const store = configureStore({
    reducer: reducersBox,
     middleware: getDefaultMiddleware => getDefaultMiddleware({
         serializableCheck: false
     }).prepend(thunk)
})

export default store
// export type RootState = ReturnType<typeof  store.getState>