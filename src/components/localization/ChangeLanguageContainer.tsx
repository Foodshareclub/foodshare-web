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
    MyListingsPage,
    OpportunitiesPage,
    ProductPage,
    SearchResultsPage,
    VolunteerPage
} from "@/pages";
import {Footer, Header, Main} from "@/components";
import {languageSelector} from "@/store/slices/userSelectors";

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
    }, [language]);

    return (
        <I18nProvider i18n={i18n}>
            <Card size="lg" minH="100vh">
                <Header getRoute={getRoute} setProductType={setProductType} productType={productType}/>
                <CardBody p={0}>
                    <Routes>
                        <Route path={"/"} element={<Main/>}/>
                        <Route path={"/*"} element={<Main/>}/>
                        <Route path={"/one-product/:type/:id"} element={<ProductPage />}/>
                        <Route path={"/aboutUs"} element={<AboutUsPage/>}/>
                        <Route path={"/contactUs"} element={<ContactUsPage/>}/>
                        <Route path={"/volunteer"} element={<VolunteerPage/>}/>
                        <Route path={"/user-listings"} element={<MyListingsPage/>}/>
                        <Route path={"/volunteer/opportunities"} element={<OpportunitiesPage/>}/>
                        <Route path={"/s/:type"} element={<SearchResultsPage/>}/>
                    </Routes>
                </CardBody>
                <Footer/>
            </Card>
        </I18nProvider>
    );
};

export default ChangeLanguageContainer;