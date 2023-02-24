import {productReducer} from "@/store/slices/productReducer";
import {userReducer} from "@/store/slices/userReducer";

//Selectors
import {
    oneProductSelector,
    currentUserProductsSelector,
    isUpdateProductSelector,
    messageProductSelector,
    productsSelector,
    productStatusSelector,
    searchProductsSelector
} from "@/store/slices/productsSelectors";

import {
    userIdFromSessionSelector,
    avatarURLSelector,
    emailSelector,
    imgURLSelector,
    isAuthSelector,
    isRegisterSelector,
    isUpdateProfileSelector,
    languageSelector,
    phoneNumberSelector,
    userFirstNameSelector,
    userIdSelector,
    userSecondNameSelector
} from "@/store/slices/userSelectors";
import {
    allRoomsSelector,
    messagesFromOneRoomSelector,
    roomSelector,
    statusSelector,
    createdSelector,
    newMessageSelector,
    newMessageRoomIdSelector,
    updateRoomStatusSelector
} from "@/store/slices/chatSelectors";

export {
    productReducer,
    userReducer,
    productsSelector,
    isUpdateProductSelector,
    oneProductSelector,
    searchProductsSelector,
    currentUserProductsSelector,
    messageProductSelector,
    userFirstNameSelector,
    userSecondNameSelector,
    userIdSelector,
    userIdFromSessionSelector,
    avatarURLSelector,
    emailSelector,
    phoneNumberSelector,
    isUpdateProfileSelector,
    languageSelector,
    isRegisterSelector,
    imgURLSelector,
    isAuthSelector,
    productStatusSelector,
    statusSelector,
    messagesFromOneRoomSelector,
    allRoomsSelector,
    createdSelector,
    roomSelector,
    newMessageSelector,
    newMessageRoomIdSelector,
    updateRoomStatusSelector
}