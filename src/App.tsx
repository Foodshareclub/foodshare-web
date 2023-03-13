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
            console.log("settings on app")
        } else if (productType === "zerowaste") {
            setProductType("food");
            console.log("zerowaste on app")
        } else if (productType === "donation") {
            console.log("donation on app")
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
            setProductType("food");
            console.log("challenges on app")
        } else if (productType === "business") {
            setProductType("food");
            console.log("business on app")
        } else if (productType === "community") {
            setProductType( "food");
            console.log("community on app")
        } else if (productType === "fridges") {
            setProductType("food");
            console.log("fridges on app")
        }else {
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
