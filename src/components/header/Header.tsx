import React from 'react';
import NavComponent from "./NavComponent";
import FilterProductComponent from "./FilterProductComponent";
import {CardHeader} from "@chakra-ui/react";

const Header = () => {
    return (
        <CardHeader>
            <NavComponent/>
            <FilterProductComponent/>
        </CardHeader>
    );
};

export default Header;