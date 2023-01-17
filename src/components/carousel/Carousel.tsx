import React from 'react';
import AliceCarousel from 'react-alice-carousel';
import 'react-alice-carousel/lib/alice-carousel.css';
import {Box, Image} from "@chakra-ui/react";
import {navigationActionsSVG} from "../../utils/navigationActions";
import {useNavigate} from "react-router-dom";

type PropsType = {
    selectChapterHandler: any
    value: any
}
const Carousel: React.FC<PropsType> = ({selectChapterHandler, value}) => {

    const navigate = useNavigate()
    const responsive = {
        0: {
            items: 5,
            itemsFit: 'contain',
        }, 500: {
            items: 8,
            itemsFit: 'contain',
        }, 900: {
            items: 9,
            itemsFit: 'contain',
        },
        1024: {
            items: 11,
            itemsFit: 'contain',
        }
    }
    const navigateHandler = (item: any) => {
        selectChapterHandler(item.name);
        navigate(`${item.name.toLowerCase()}`);
    }
    return (
        <AliceCarousel responsive={responsive} controlsStrategy="responsive" disableButtonsControls={true}
                       keyboardNavigation={true}
                       disableDotsControls={true} infinite
                       animationType="slide" activeIndex={0} mouseTracking
                       items={navigationActionsSVG.map((item, id) => (
                               <Box key={id} onClick={() => navigateHandler(item)} cursor="pointer">
                                   <Image m="0 auto" alignItems="center"
                                          src={value?.name === item.name ? item.red : item.src}
                                          boxSize={6}
                                   />
                                   <div>{item.name}</div>
                               </Box>
                           )
                       )}/>
    );
}
export default Carousel