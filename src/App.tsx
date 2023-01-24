import React, {useEffect, useState} from 'react';
import {useAppDispatch} from "./hook/hooks";
import {getSession} from "./store/slices/userReducer";
import {Session} from "@supabase/supabase-js";
import {supabase} from "./supaBase.config";
import {getProductTC} from "./store/slices/productReducer";
import ChangeLanguageContainer from "./components/localization/ChangeLanguageContainer";


function App() {
    const dispatch = useAppDispatch();
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => setSession(session));
        supabase.auth.onAuthStateChange((event, session) => setSession(session));
    }, []);

    const [productType, setProductType] = useState('food');

    useEffect(() => {
        dispatch(getProductTC(productType));
    }, [productType]);

    const getRoute = (route: string) => setProductType(route);

    if (session) {
        dispatch(getSession(session));
    }

    const userID = session?.user.id ?? '';

    return (
        <ChangeLanguageContainer
            setProductType={setProductType}
            productType={productType}
            getRoute={getRoute}
            userID={userID}
        />
    )
}

export default App;
