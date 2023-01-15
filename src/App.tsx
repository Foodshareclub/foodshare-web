import React, {useEffect, useState} from 'react';
import Header from "./components/header/Header";
import Main from "./components/main/Main";
import Footer from "./components/footer/Footer";
import {Route, Routes} from "react-router-dom";
import {Registration} from "./pages/registration/Registration";
import ProductPage from "./pages/productPage/ProductPage";
import {Card, CardBody} from "@chakra-ui/react";
import AboutUsPage from "./pages/aboutUs/AboutUsPage";
import ContactUsPage from "./pages/contactUs/ContactUsPage";
import VolunteerPage from "./pages/volunteerPages/VolunteerPage";
import OpportunitiesPage from "./pages/volunteerPages/OpportunitiesPage";
import MyListingsPage from "./pages/prfilePages/MyListingsPage";
import WantedPage from "./pages/wantedPage/WantedPage";
import BorrowPage from "./pages/borrowPage/BorrowPage";
import BusinessPage from "./pages/businessPage/BusinessPage";
import {useAppDispatch, useAppSelector} from "./hook/hooks";
import {getSession} from "./store/slices/userReducer";
import {Session} from "@supabase/supabase-js";
import {supabase} from "./supaBase.config";
import {AllValuesType} from "./api/profileAPI";


function App() {
    const dispatch = useAppDispatch()
    const [session, setSession] = useState<Session | null>(null)

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => setSession(session))
        supabase.auth.onAuthStateChange((event, session) => setSession(session))

    }, [])
    if (session) {
        dispatch(getSession(session))
    }


    return (
        <Card size="lg" minH="100vh">
            <Header/>
            <CardBody>
                <Routes>
                    <Route path={"/"} element={<Main/>}/>
                    <Route path={"/*"} element={<Main/>}/>
                    <Route path={"/registration"} element={<Registration/>}/>
                    <Route path={"/oneProd"} element={<ProductPage/>}/>
                    <Route path={"/wanted"} element={<WantedPage/>}/>
                    <Route path={"/borrow"} element={<BorrowPage/>}/>
                    <Route path={"/business"} element={<BusinessPage/>}/>
                    <Route path={"/aboutUs"} element={<AboutUsPage/>}/>
                    <Route path={"/contactUs"} element={<ContactUsPage/>}/>
                    <Route path={"/volunteer"} element={<VolunteerPage/>}/>
                    <Route path={"/user-listings"} element={<MyListingsPage/>}/>
                    <Route path={"/volunteer/opportunities"} element={<OpportunitiesPage/>}/>
                </Routes>
            </CardBody>
            <Footer/>
        </Card>
    );
}

export default App;
