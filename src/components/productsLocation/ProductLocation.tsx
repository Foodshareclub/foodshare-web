import {Box} from "@chakra-ui/react";
import React from "react";
import Leaflet from "@/components/leaflet/Leaflet";

type LocationType = {
    indicator?: string
}

export const ProductsLocation: React.FC<LocationType> = ({indicator}) => {

    return (
        <Box w={{md: indicator ? "70%" : "50%", base: "100%"}} py={{md: 0, base: 10}}>
            <Leaflet/>
        </Box>

    )
}