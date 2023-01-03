import React from 'react';
import NavComponent from "./NavComponent";
import FilterProductComponent from "./FilterProductComponent";
import {CardHeader} from "@chakra-ui/react";

const Header = () => {
    return (
        <CardHeader height={"20vh"}>
            <NavComponent/>
            <FilterProductComponent/>
        </CardHeader>
    );
};

export default Header;