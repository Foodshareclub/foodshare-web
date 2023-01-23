import React, {useEffect, useState} from 'react';
import NavComponent from "./NavComponent";
import FilterProductComponent from "./FilterProductComponent";
import {CardHeader, useColorModeValue} from "@chakra-ui/react";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {getValueFromDBTC} from "../../store/slices/userReducer";

type HeaderType = {
    getRoute: (route: string) => void
    productType: string
    setProductType: (type: string) => void
}

const Header: React.FC<HeaderType> = ({getRoute, setProductType}) => {
    const dispatch = useAppDispatch()
    const isRegister = useAppSelector(state => state.user.isRegister);
    const isUpdate = useAppSelector(state => state.user.isUpdate);
    const {user} = useAppSelector(state => state.user.session);

    const [isMainPage, setIsMainPage] = useState(true);

    useEffect(() => {
        if (user.id) {
            const values = {
                fromTableName: "profiles",
                columnValue: 'id',
                columnValueItem: user.id,
                selectRow: "*"
            }
            dispatch(getValueFromDBTC(values));
        }
    }, [user, isUpdate])

    return (

        <CardHeader w="100vw" height="23vh" position="fixed" zIndex={2} pb={0}
                    bg={useColorModeValue('white', 'gray.900')}
        >
            <NavComponent isRegister={isRegister} setIsMainPage={setIsMainPage} setProductType={setProductType}/>
            <FilterProductComponent getRoute={getRoute} setIsMainPage={setIsMainPage} isMainPage={isMainPage}/>

        </CardHeader>
    );
};

export default Header;