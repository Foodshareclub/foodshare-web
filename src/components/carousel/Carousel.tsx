import React, {useState} from 'react';
import AliceCarousel from 'react-alice-carousel';
import 'react-alice-carousel/lib/alice-carousel.css';
import {Box, IconButton, Image, Text} from "@chakra-ui/react";
import {navigationActionsSVG, responsive} from "../../utils/navigationActions";
import {useNavigate} from "react-router-dom";
import "react-alice-carousel/lib/scss/alice-carousel.scss";
import {ValueType} from "../header/FilterProductComponent";
import {ArrowBackIcon, ArrowForwardIcon} from "@chakra-ui/icons";
import useMediaQuery from "../../utils/useMediaQuery";

type PropsType = {
    selectChapterHandler: (name: string) => void
    value?: ValueType
    getRoute: (route: string) => void
    isMainPage: boolean
    setIsMainPage: (isMainPage: boolean) => void
}

const Carousel: React.FC<PropsType> = ({
                                           selectChapterHandler,
                                           value,
                                           getRoute,
                                           setIsMainPage,
                                           isMainPage
                                       }) => {
    const isSmallerThan1024 = useMediaQuery('(min-width:1024px)');

    const navigate = useNavigate();

    const navigateHandler = (name: string) => {
        selectChapterHandler(name);
        navigate(`${name.toLowerCase()}`);
        getRoute(name.toLowerCase());
        setIsMainPage(false);
    }

    const [mainIndex, setMainIndex] = useState(0);

    const slideNext = () => setMainIndex(mainIndex + 1);
    const slidePrev = () => setMainIndex(mainIndex - 1);

    return (
        <>
            {
                mainIndex !== 0 && <IconButton
                    onClick={slidePrev}
                    alignSelf="center"
                    size='xs'
                    fontSize={30}
                    variant="#7D7D7D"
                    colorScheme='teal'
                    aria-label='prev' icon={<ArrowBackIcon/>}/>
            }

            <AliceCarousel
                responsive={responsive}
                controlsStrategy="responsive"
                disableButtonsControls={true}
                keyboardNavigation={true}
                disableDotsControls={true}
                infinite
                activeIndex={mainIndex}
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
                                   src={(value && value.name === item.name) && !isMainPage ? item.red : item.src}
                                   boxSize={6}
                            />
                            <Text
                                noOfLines={1}
                                mb={0}
                                pb={0}
                                textAlign={"center"}
                            >
                                {item.name}
                            </Text>
                        </Box>
                    )
                )}/>

            {
                !isSmallerThan1024 && <IconButton
                    onClick={slideNext}
                    alignSelf="center" size='xs'
                    variant="#7D7D7D"
                    fontSize={30}
                    colorScheme='lightgray'
                    aria-label='prev' icon={<ArrowForwardIcon/>}
                />
            }
        </>

    );
}
export default Carousel