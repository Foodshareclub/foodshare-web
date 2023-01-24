import React from 'react';
import AliceCarousel from 'react-alice-carousel';
import 'react-alice-carousel/lib/alice-carousel.css';
import {Box, Image, Text} from "@chakra-ui/react";
import {navigationActionsSVG, responsive} from "../../utils/navigationActions";
import {useNavigate} from "react-router-dom";
import "react-alice-carousel/lib/scss/alice-carousel.scss";
import {ValueType} from "../header/FilterProductComponent";
import {useAppSelector} from "../../hook/hooks";
import {PagesType} from "../header/Header";

type PropsType = {
    selectChapterHandler: (name: string) => void
    value?: ValueType
    getRoute: (route: string) => void
    pageType: PagesType
    setPageType: (isMainPage: PagesType) => void
    productType: string
}

const Carousel: React.FC<PropsType> = ({
                                           selectChapterHandler,
                                           value,
                                           getRoute,
                                           setPageType,
                                           pageType,
                                           productType
                                       }) => {
    const language = useAppSelector(state => state.user.language)
    const navigate = useNavigate();

    const navigateHandler = (name: string) => {
        const routeName = name.toLowerCase()
        selectChapterHandler(name);
        navigate(`${routeName === 'food' ? '/' : routeName}`);
        getRoute(routeName);
        setPageType("productComponent");
    }


    return <AliceCarousel
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
                <Box
                    alignSelf={"center"}
                    key={id}
                    onClick={() => navigateHandler(item.name)}
                    cursor="pointer"
                >
                    <Image m="0 auto" alignItems="center"
                           src={
                               (productType === item.name.toLowerCase()) && pageType === 'productComponent'
                                   ? item.red
                                   : item.src
                           }
                           boxSize={6}
                    />
                    <Text
                        noOfLines={1}
                        mb={0}
                        pb={0}
                        textAlign="center"
                    >
                        {item[language]}
                    </Text>
                </Box>
            )
        )}/>
}
export default Carousel