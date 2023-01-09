import React, {useEffect, useState} from 'react';
import Header from "./components/header/Header";
import Main from "./components/main/Main";
import Footer from "./components/footer/Footer";
import {Route, Routes} from "react-router-dom";
import {Registration} from "./pages/registration/Registration";
import {Login} from "./pages/login/Login";
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
//import "./exampleIndex.css"
import {supabase} from "./supaBase.config";
import Auth from "./components/myExample/Auth";
import Account from "./components/myExample/Account";
import {Session} from "@supabase/supabase-js";


function App() {
    const [session, setSession] = useState<Session | null>(null)

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => {
            setSession(session);
        })

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
    }, [])

    // return (
    //     <div className="container" style={{padding: '50px 0 100px 0'}}>
    //         {!session ? <Auth/> : <Account key={session.user.id} session={session}/>}
    //     </div>
    // )


    return (
        <Card size="lg" minH="100vh">
            <Header/>
            <CardBody>
                <Routes>
                    <Route path={"/"} element={<Main/>}/>
                    <Route path={"/*"} element={<Main/>}/>
                    <Route path={"/login"} element={<Login/>}/>
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
