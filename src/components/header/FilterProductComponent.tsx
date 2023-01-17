import * as React from 'react';
import {useState} from 'react';
import {navigationActionsSVG} from "../../utils/navigationActions";
import {Box} from "@chakra-ui/react";
import "../../index.scss";
import Carousel from "../carousel/Carousel";

const SimpleBottomNavigation = () => {
    const [value, setValue] = useState<any>();

    const selectChapterHandler = (name: string) => {
        const obj = navigationActionsSVG.find(item => item.name === name);
        setValue(obj);
    }

    return (
        <Box display='flex' pt={8} justifyContent="space-around" alignItems='baseline'>
            <Carousel selectChapterHandler={selectChapterHandler} value={value}/>

        </Box>
    )
}
export default SimpleBottomNavigation