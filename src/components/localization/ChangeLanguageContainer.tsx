import React, {useEffect} from 'react';
import {i18n} from "@lingui/core";
import {I18nProvider} from "@lingui/react";
import {Card, CardBody} from "@chakra-ui/react";
import {Route, Routes} from "react-router-dom";
import {dynamicActivate} from "@/utils/i18n";
import {useAppSelector} from "@/hook/hooks";
import {AboutUsPage, ContactUsPage, MyListingsPage, OpportunitiesPage, ProductPage, VolunteerPage} from "@/pages";
import {Footer, Header, Main} from "@/components";

type ContainerProps = {
    productType: string
    getRoute: (route: string) => void
    setProductType: (productType: string) => void
    userID: string
}
const ChangeLanguageContainer: React.FC<ContainerProps> = ({productType, getRoute, setProductType, userID}) => {
    const language = useAppSelector(state => state.user.language)

    useEffect(() => {
        dynamicActivate(language).then(() => {
        })
    }, [language]);

    return (
        <I18nProvider i18n={i18n}>
            <Card size="lg" minH="100vh">
                <Header getRoute={getRoute} setProductType={setProductType} productType={productType}/>
                <CardBody>
                    <Routes>
                        <Route path={"/"} element={<Main/>}/>
                        <Route path={"/*"} element={<Main/>}/>
                        <Route path={"/oneProd"} element={<ProductPage />}/>
                        <Route path={"/aboutUs"} element={<AboutUsPage/>}/>
                        <Route path={"/contactUs"} element={<ContactUsPage/>}/>
                        <Route path={"/volunteer"} element={<VolunteerPage/>}/>
                        <Route path={"/user-listings"} element={<MyListingsPage userID={userID}/>}/>
                        <Route path={"/volunteer/opportunities"} element={<OpportunitiesPage/>}/>
                    </Routes>
                </CardBody>
                <Footer/>
            </Card>
        </I18nProvider>
    );
};

export default ChangeLanguageContainer;