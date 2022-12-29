import * as React from 'react';
import {useState} from 'react';
import {navigationActionsSVG} from "../../utils/navigationActions";
import {Box, Image} from "@chakra-ui/react";
import "../../index.scss";
import {useNavigate} from "react-router-dom";

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
const navigate = useNavigate()
    return (
        <Box>
            <Image onClick={() => {
                f1(el.name)
                navigate(`${el.name.toLowerCase()}`)
            }} m="0 auto" alignItems="center" cursor="pointer"
                   src={value?.name === el.name ? el.red : el.src}
                   boxSize={6}
            />
            <div>{el.name}</div>
        </Box>

    );
}
export default SimpleBottomNavigation