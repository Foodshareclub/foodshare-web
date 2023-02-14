import React, {useEffect, useState} from 'react';
import {Session} from "@supabase/supabase-js";
import {ChangeLanguageContainer, PasswordRecoveryModal} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {supabase} from "@/supaBase.config";
import {getAddressProfileTC, getAllCountriesTC, userActions} from "@/store/slices/userReducer";
import {getProductsTC} from "@/store/slices/productReducer";
import {useLocation} from "react-router-dom";
import {isAuthSelector} from "@/store";

function App() {
    const isAuth = useAppSelector(isAuthSelector);
    const location = useLocation();
    let type = location.pathname.split('/')[1];

    const [productType, setProductType] = useState(type || "food");
    const [session, setSession] = useState<Session | null>(null);

    const actions = useActionCreators({getProductsTC, getAddressProfileTC, getAllCountriesTC, ...userActions});

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => setSession(session));
        supabase.auth.onAuthStateChange((event, session) => {
            setSession(session)
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setSession(session);
            }
        });
    }, []);

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
        return () => {
            console.log('return app')
        };
    }, [productType]);

    const getRoute = (route: string) => {
        setProductType(route);
    }

    if (session) {
        actions.getSession(session);
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
