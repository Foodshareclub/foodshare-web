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
    const isAuth = useAppSelector(isAuthSelector);
    const [productType, setProductType] = useState(type || "food");
    const actions = useActionCreators({getProductsTC, getSessionTC, listenChannelTC, ...userActions});

    useEffect(() => {
        actions.getSessionTC()
    }, [isAuth]);

    useEffect(() => {
        if (productType === "settings") {
            console.log("settings on app")
        } else if (productType === "volunteer") {
            console.log("volunteer on app")
        } else if (productType === "user-listings") {
            console.log("user-listings on app")
        } else if (productType === "chat-main") {
            console.log("chat-main on app")
        } else if (productType === "aboutUs") {
            console.log("aboutUs on app")
        } else if (productType === "one-product") {
            console.log("one-product on app")
        } else if (productType === "challenges") {
            console.log("challenges on app")
            setProductType("food")
        } else if (productType === "business") {
            console.log("business on app")
            setProductType("food")
        } else if (productType === "fridges") {
            console.log("fridges on app")
            setProductType("food")
        } else if (productType === "community") {
            console.log("community on app")
            setProductType("food")
        } else if (productType === "map") {
            console.log("map on app")
            setProductType("food")
        } else {
            actions.getProductsTC(productType);
        }

        console.log('return app')

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
