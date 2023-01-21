import React, {useEffect, useState} from 'react';
import {i18n} from "@lingui/core";
import {defaultLocale, dynamicActivate} from "../../utils/i18n";
import {I18nProvider} from "@lingui/react";
import {Card, CardBody} from "@chakra-ui/react";
import Header from "../header/Header";
import {Route, Routes} from "react-router-dom";
import {Main} from "../main/Main";
import ProductPage from "../../pages/productPage/ProductPage";
import AboutUsPage from "../../pages/aboutUs/AboutUsPage";
import ContactUsPage from "../../pages/contactUs/ContactUsPage";
import VolunteerPage from "../../pages/volunteerPages/VolunteerPage";
import MyListingsPage from "../../pages/prfilePages/MyListingsPage";
import OpportunitiesPage from "../../pages/volunteerPages/OpportunitiesPage";
import Footer from "../footer/Footer";
import Inbox from "../exampleLingui/Inbox";
import {useAppSelector} from "../../hook/hooks";

type ContainerProps = {
    productType:string
    getRoute: (route: string) => void
}
const ChangeLanguageContainer:React.FC<ContainerProps> = ({productType,getRoute}) => {
const language = useAppSelector(state => state.user.language)
    // i18n.load(defaultLocale, {});
    // i18n.activate(defaultLocale);

    useEffect(() => {
            dynamicActivate(language).then(()=>{})
    }, [language]);

    return (
        <I18nProvider i18n={i18n}>
            <Card size="lg" minH="100vh">
                <Header getRoute={getRoute}/>
                <CardBody>
                    <Routes>
                        <Route path={"/"} element={<Main productType={productType}/>}/>
                        <Route path={"/*"} element={<Main productType={productType}/>}/>
                        <Route path={"/oneProd"} element={<ProductPage/>}/>
                        <Route path={"/aboutUs"} element={<AboutUsPage/>}/>
                        <Route path={"/contactUs"} element={<ContactUsPage/>}/>
                        <Route path={"/volunteer"} element={<VolunteerPage/>}/>
                        <Route path={"/user-listings"} element={<MyListingsPage/>}/>
                        <Route path={"/volunteer/opportunities"} element={<OpportunitiesPage/>}/>
                    </Routes>
                </CardBody>
                <Footer/>
                {/*<Inbox/>*/}
            </Card>
        </I18nProvider>
    );
};

export default ChangeLanguageContainer;