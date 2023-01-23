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

export type PagesType = 'mainPage' | 'productComponent' | 'profileSettings';

const Header: React.FC<HeaderType> = ({getRoute, setProductType}) => {
    const dispatch = useAppDispatch()
    const isRegister = useAppSelector(state => state.user.isRegister);
    const isUpdate = useAppSelector(state => state.user.isUpdate);
    const {user} = useAppSelector(state => state.user.session);

    const [pageType, setPageType] = useState<PagesType>("mainPage");
    console.log(pageType)
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

        <CardHeader pb={0} bg={useColorModeValue('gray.50', 'gray.900')}>
            <NavComponent isRegister={isRegister} setPageType={setPageType} setProductType={setProductType}/>
            <FilterProductComponent getRoute={getRoute} setPageType={setPageType} pageType={pageType}/>

        </CardHeader>
    );
};

export default Header;