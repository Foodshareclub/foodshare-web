import React, {useEffect, useState} from 'react';
import {ChangeLanguageContainer, PasswordRecoveryModal} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {getSessionTC, userActions} from "@/store/slices/userReducer";
import {getProductsTC} from "@/store/slices/productReducer";
import {useLocation} from "react-router-dom";
import {isAuthSelector} from "@/store";
import {listenChannelTC} from "@/store/slices/chatReducer";

function App() {
    const location = useLocation();
    let type = location.pathname.split('/')[1];
    const [productType, setProductType] = useState(type);
    const isAuth = useAppSelector(isAuthSelector);
    const actions = useActionCreators({getProductsTC, getSessionTC, listenChannelTC, ...userActions});

    useEffect(() => {
        actions.getSessionTC()
    }, [isAuth]);

    useEffect(() => {
        if (productType === "settings") {
            return
        } else if (productType === "zerowaste") {
            setProductType("food");

        } else if (productType === "donation") {
            return
        } else if (productType === "volunteer") {
            return
        } else if (productType === "user-listings") {
            return
        } else if (productType === "chat-main") {
            return
        } else if (productType === "aboutUs") {
            return
        } else if (productType === "one-product") {
            return
        } else if (productType === "challenges") {
            setProductType("food");
        } else if (productType === "business") {
            setProductType("food");
        } else if (productType === "community") {
            setProductType("food");
        } else if (productType === "fridges") {
            setProductType("food");
        } else {
            actions.getProductsTC(productType);
        }
    }, [productType]);

    const getRoute = (route: string) => {
        setProductType(route);
    }
    return (
        <>
            <ChangeLanguageContainer
                setProductType={setProductType}
                productType={productType}
                getRoute={getRoute}
            />
            <PasswordRecoveryModal/>
        </>

    )
}

export default App;
