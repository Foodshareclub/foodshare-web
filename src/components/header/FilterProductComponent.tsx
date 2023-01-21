import * as React from 'react';
import {useState} from 'react';
import {navigationActionsSVG} from "../../utils/navigationActions";
import {Box} from "@chakra-ui/react";
import "../../index.scss";
import Carousel from "../carousel/Carousel";


export type ValueType = {
    name: string
    src: string
    red: string
}
type FilterType = {
    getRoute: (route: string) => void
}
const SimpleBottomNavigation: React.FC<FilterType> = ({getRoute}) => {
    const [value, setValue] = useState<ValueType | undefined>({} as ValueType);

    const selectChapterHandler = (name: string) => {
        const obj = navigationActionsSVG.find(item => item.name === name);
        setValue(obj);
    }

    return (
        <Box display='flex' p={8} justifyContent="space-around">
            <Carousel selectChapterHandler={selectChapterHandler} value={value} getRoute={getRoute}/>
        </Box>
    )
}
export default SimpleBottomNavigation