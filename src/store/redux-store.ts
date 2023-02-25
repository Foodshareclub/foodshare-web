import {combineReducers, configureStore} from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import {chatReducer, productReducer, userReducer} from ".";

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