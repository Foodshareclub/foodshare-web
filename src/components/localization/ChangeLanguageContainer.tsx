import React, {useEffect} from 'react';
import {i18n} from "@lingui/core";
import {I18nProvider} from "@lingui/react";
import {Card, CardBody} from "@chakra-ui/react";
import {Route, Routes} from "react-router-dom";
import {dynamicActivate} from "@/utils/i18n";
import {useAppSelector} from "@/hook/hooks";
import {
    AboutUsPage,
    ContactUsPage,
    LoginSecurityPage,
    MyListingsPage,
    PersonalInfoPage,
    ProductPage,
    SearchResultsPage,
    SettingsPage,
    VolunteerPage
} from "@/pages";
import {Footer, Header, Main} from "@/components";
import {languageSelector} from "@/store/slices/userSelectors";
import {PATH} from "@/utils";
import OneVolunteer from "@/components/volonteerCard/OneVolunteer";
import ChatMainPage from "@/pages/chat/ChatMainPage";

type ContainerProps = {
    productType: string
    getRoute: (route: string) => void
    setProductType: (productType: string) => void

}
const ChangeLanguageContainer: React.FC<ContainerProps> = ({productType, getRoute, setProductType}) => {

    const language = useAppSelector(languageSelector);
    useEffect(() => {
        dynamicActivate(language).then(() => {
        })
        return () => {
            console.log('return ChangeLanguageContainer')
        };
    }, [language]);
    const insertRouteHandler = (route: string) => {
        getRoute(route)
    }
    return (

        <I18nProvider i18n={i18n}>
            <Card size="lg" minH="100vh">
                <Header getRoute={(route) => insertRouteHandler(route)} setProductType={setProductType}
                        productType={productType}/>
                <CardBody p={0}>
                    <Routes>
                        <Route path={PATH.main} element={<Main/>}>
                            <Route path={"*"} element={<Main/>}/>
                        </Route>

                        <Route path={PATH.productPage} element={<ProductPage/>}/>
                        <Route path={PATH.aboutUsPage} element={<AboutUsPage/>}/>
                        <Route path={PATH.contactUsPage} element={<ContactUsPage/>}/>
                        <Route path={PATH.volunteerPage} element={<VolunteerPage/>}/>

                        <Route path={"/chat-main/:id"} element={<ChatMainPage/>}/>

                        <Route path={"/volunteer/:id"} element={<OneVolunteer/>}/>

                        <Route path={PATH.myListingsPage} element={<MyListingsPage/>}/>
                        <Route path={PATH.searchResultsPage} element={<SearchResultsPage/>}/>
                        <Route path={PATH.settingsPage} element={<SettingsPage/>}/>
                        <Route path={PATH.personalInfoPage} element={<PersonalInfoPage/>}/>
                        <Route path={PATH.loginSecurityPage} element={<LoginSecurityPage/>}/>
                    </Routes>
                </CardBody>
                <Footer/>
            </Card>
        </I18nProvider>
    );
};

export default ChangeLanguageContainer;