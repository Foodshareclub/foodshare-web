import React, {useEffect, useState} from 'react';

import {Session} from "@supabase/supabase-js";
import {ChangeLanguageContainer, PasswordRecoveryModal} from "@/components";
import {useAppDispatch} from "@/hook";
import {supabase} from "@/supaBase.config";
import {userActions} from "@/store/slices/userReducer";
import {getProductTC} from "@/store/slices/productReducer";

function App() {
    const dispatch = useAppDispatch();
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => setSession(session));
        supabase.auth.onAuthStateChange((event, session) => {
            setSession(session)
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setSession(session);
            }
        });
    }, []);

    const [productType, setProductType] = useState('food');

    useEffect(() => {
        dispatch(getProductTC(productType));
    }, [productType]);

    const getRoute = (route: string) => setProductType(route);

    if (session) {
        dispatch(userActions.getSession(session));
    }

    const userID = session?.user.id ?? '';

    return (
        <>
            <ChangeLanguageContainer
                setProductType={setProductType}
                productType={productType}
                getRoute={getRoute}
                userID={userID}
            />
            <PasswordRecoveryModal/>
        </>

    )
}

export default App;
