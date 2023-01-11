import React, {useEffect} from 'react';
import NavComponent from "./NavComponent";
import FilterProductComponent from "./FilterProductComponent";
import {CardHeader} from "@chakra-ui/react";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {getSessionTC} from "../../store/slices/userReducer";

const Header = () => {
    const {error,isRegister,session: {user: {user_metadata}}} = useAppSelector(state => state.user);
    return (
        <CardHeader height="20vh">
            <NavComponent isRegister={isRegister} user_metadata={user_metadata}/>
            <FilterProductComponent/>
        </CardHeader>
    );
};

export default Header;