import React from 'react';
import AliceCarousel from 'react-alice-carousel';
import 'react-alice-carousel/lib/alice-carousel.css';
import {Box, Image, Text} from "@chakra-ui/react";
import {navigationActionsSVG, responsive} from "../../utils/navigationActions";
import {useNavigate} from "react-router-dom";
import "react-alice-carousel/lib/scss/alice-carousel.scss";
import {useAppSelector} from "@/hook";
import {PagesType} from "../header/Header";
import {languageSelector} from "@/store/slices/userSelectors";

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
                    py={1}
                    borderBottomWidth={(productType === item.name.toLowerCase()) && pageType === 'productComponent' ? 3 : 0}
                    borderStyle={'solid'}
                    borderColor={'#FF2D55'}
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
                        color={(productType === item.name.toLowerCase()) && pageType === 'productComponent' ? "#FF2D55" : "inherit"}
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