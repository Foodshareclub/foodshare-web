import React from 'react';
import AliceCarousel from 'react-alice-carousel';
import 'react-alice-carousel/lib/alice-carousel.css';
import {navigationActionsSVG, responsive} from "../../utils/navigationActions";
import {useNavigate} from "react-router-dom";
import "react-alice-carousel/lib/scss/alice-carousel.scss";
import {useAppSelector} from "@/hook";
import {PagesType} from "../header/Header";
import {languageSelector} from "@/store/slices/userSelectors";
import {ItemsForCarousel} from "@/components";


type PropsType = {
    getRoute: (route: string) => void
    pageType: PagesType
    setPageType: (isMainPage: PagesType) => void
    productType: string
}

const Carousel: React.FC<PropsType> = ({
                                           getRoute,
                                           setPageType,
                                           pageType,
                                           productType
                                       }) => {
    const language = useAppSelector(languageSelector);
    const navigate = useNavigate();
    const navigateHandler = (name: string) => {
        const routeName = name.toLowerCase();
        navigate(`${routeName === 'food' ? '/food' : routeName}`);
        getRoute(routeName);
        setPageType("productComponent");
    }

    return (
        <AliceCarousel
        responsive={responsive}
        controlsStrategy="responsive"
        disableButtonsControls={true}
        keyboardNavigation={true}
        disableDotsControls={true}
        infinite
        activeIndex={0}
        animationDuration={100}
        touchTracking={true}
        items={navigationActionsSVG.map((item, id) => (
                <ItemsForCarousel key={id} item={item} language={language} navigateHandler={navigateHandler}
                                  pageType={pageType} productType={productType}/>
            )
        )}/>
    )
}
export default Carousel