import * as React from 'react';
import {useState} from 'react';
import {navigationActionsSVG} from "../../utils/navigationActions";
import {Box, Image} from "@chakra-ui/react";
import "../../index.scss";
import {useNavigate} from "react-router-dom";

const SimpleBottomNavigation = () => {
    const [value, setValue] = useState<any>();
    
    const selectChapterHandler = (name: string) => {
        const obj = navigationActionsSVG.find(item => item.name === name);
        setValue(obj);
    }

    return (
        <Box display='flex' pt={8} justifyContent="space-around" alignItems='baseline'>

            {navigationActionsSVG.map((el, id) => {
                return <FilterProductCompBox
                    el={el}
                    key={id}
                    value={value}
                    selectChapterHandler={selectChapterHandler}
                />
            })}
        </Box>
    )
}

const FilterProductCompBox = ({value, el, selectChapterHandler}: any) => {
    const navigate = useNavigate();

    const navigateHandler = () => {
        selectChapterHandler(el.name);
        navigate(`${el.name.toLowerCase()}`);
    }

    return (
        <Box onClick={navigateHandler} cursor="pointer">
            <Image m="0 auto" alignItems="center"
                   src={value?.name === el.name ? el.red : el.src}
                   boxSize={6}
            />
            <div>{el.name}</div>
        </Box>

    );
}
export default SimpleBottomNavigation