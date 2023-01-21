import React, {useEffect, useState} from 'react';
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import {Route, Routes} from "react-router-dom";
import ProductPage from "./pages/productPage/ProductPage";
import {Card, CardBody} from "@chakra-ui/react";
import AboutUsPage from "./pages/aboutUs/AboutUsPage";
import ContactUsPage from "./pages/contactUs/ContactUsPage";
import VolunteerPage from "./pages/volunteerPages/VolunteerPage";
import OpportunitiesPage from "./pages/volunteerPages/OpportunitiesPage";
import MyListingsPage from "./pages/prfilePages/MyListingsPage";
import {useAppDispatch} from "./hook/hooks";
import {getSession} from "./store/slices/userReducer";
import {Session} from "@supabase/supabase-js";
import {supabase} from "./supaBase.config";
import {getAllProductsTC} from "./store/slices/foodReducer";
import ChangeLanguageContainer from "./components/localization/ChangeLanguageContainer";

import {Main} from "./components/main/Main";



function App() {
    const dispatch = useAppDispatch();
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => setSession(session)
        );
        supabase.auth.onAuthStateChange((event, session) => setSession(session));

    }, []);


    const [productType, setProductType] = useState('');

    useEffect(() => {
        dispatch(getAllProductsTC());
    }, []);

    const getRoute = (route: string) => setProductType(route);

    if (session) {
        dispatch(getSession(session));
    }


    return <ChangeLanguageContainer setProductType={setProductType} productType={productType} getRoute={getRoute}/>


}

export default App;
