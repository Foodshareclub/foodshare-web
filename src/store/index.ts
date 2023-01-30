import {productReducer} from "@/store/slices/productReducer";
import {userReducer} from "@/store/slices/userReducer";

//Selectors
import {productsSelector} from "@/store/slices/productsSelectors";
import {searchProductsSelector} from "@/store/slices/productsSelectors";
import {currentUserProductsSelector} from "@/store/slices/productsSelectors";
import {isUpdateProductSelector} from "@/store/slices/productsSelectors";

import {userFirstNameSelector} from "@/store/slices/userSelectors";
import {userSecondNameSelector} from "@/store/slices/userSelectors";
import {userIdSelector} from "@/store/slices/userSelectors";
import {avatarURLSelector} from "@/store/slices/userSelectors";
import {emailSelector} from "@/store/slices/userSelectors";
import {phoneNumberSelector} from "@/store/slices/userSelectors";

import {userIdFromSessionSelector} from "@/store/slices/userSelectors";

import {imgURLSelector} from "@/store/slices/userSelectors";
import {isAuthSelector} from "@/store/slices/userSelectors";
import {languageSelector} from "@/store/slices/userSelectors";
import {isUpdateSelector} from "@/store/slices/userSelectors";
import {isRegisterSelector} from "@/store/slices/userSelectors";
import {isLoadingSelector} from "@/store/slices/userSelectors";
import {isUpdateProfileSelector} from "@/store/slices/userSelectors";

export {
    productReducer,
    userReducer,

    productsSelector,
    isUpdateProductSelector,
    searchProductsSelector,
    currentUserProductsSelector,

    userFirstNameSelector,
    userSecondNameSelector,
    userIdSelector,
    avatarURLSelector,
    emailSelector,
    phoneNumberSelector,

    userIdFromSessionSelector,

    isUpdateProfileSelector,
    languageSelector,
    isRegisterSelector,
    imgURLSelector,
    isUpdateSelector,
    isAuthSelector,
    isLoadingSelector
}