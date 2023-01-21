import React, {useEffect} from 'react';
import NavComponent from "./NavComponent";
import FilterProductComponent from "./FilterProductComponent";
import {CardHeader, useColorModeValue} from "@chakra-ui/react";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {getValueFromDBTC} from "../../store/slices/userReducer";

export type HeaderType = {
    getRoute: (route: string) => void
}

const Header: React.FC<HeaderType> = ({getRoute}) => {
    const dispatch = useAppDispatch()
    const isRegister = useAppSelector(state => state.user.isRegister);
    const isUpdate = useAppSelector(state => state.user.isUpdate);
    const {user} = useAppSelector(state => state.user.session);

    useEffect(() => {
        if (user.id) {
            const values = {
                fromTableName: "profiles",
                columnValue: 'id',
                columnValueItem: user.id,
                selectRow: "*"
            }
            dispatch(getValueFromDBTC(values))
        }
    }, [user, isUpdate])

    return (
        <CardHeader pb={0} bg={useColorModeValue('gray.50', 'gray.900')}>
            <NavComponent isRegister={isRegister}/>
            <FilterProductComponent getRoute={getRoute}/>
        </CardHeader>
    );
};

export default Header;