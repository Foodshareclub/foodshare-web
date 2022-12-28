import * as React from 'react';
import {navigationActionsSVG} from "../../utils/navigationActions";
import {Box, Image} from "@chakra-ui/react";
import "../../index.scss";
import {useEffect, useState} from "react";

const SimpleBottomNavigation = () => {
    const [value, setValue] = useState<any>();
    const f1 = (name: string) => {
        const obj = navigationActionsSVG.find(item => item.name === name);
        setValue(obj)
    }


    return (
        <Box display='flex' pt={8} justifyContent="space-around" alignItems='baseline'>

            {navigationActionsSVG.map((el, id) => {
                return <FilterProductCompBox
                    el={el}
                    key={id}
                    value={value}
                    f1={f1}
                />
            })}
        </Box>
    )
}

const FilterProductCompBox = ({value, el, f1}: any) => {

    return (
        <Box>
            <Image onClick={() => f1(el.name)} m="0 auto" alignItems="center" cursor="pointer"
                   src={value?.name === el.name ? el.red : el.src}
                   boxSize={6}
            />
            <div>{el.name}</div>
        </Box>

    );
}
export default SimpleBottomNavigation