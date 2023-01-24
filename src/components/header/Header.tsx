import React, {useEffect, useState} from 'react';
import NavComponent from "./NavComponent";
import FilterProductComponent from "./FilterProductComponent";
import {CardHeader, useColorModeValue} from "@chakra-ui/react";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {getValueFromDBTC} from "../../store/slices/userReducer";

type HeaderType = {
    getRoute: (route: string) => void
    setProductType: (type: string) => void
    productType: string
}

export type PagesType = 'productComponent' | 'profileSettings';

const Header: React.FC<HeaderType> = ({getRoute, setProductType, productType}) => {
    const dispatch = useAppDispatch()
    const isRegister = useAppSelector(state => state.user.isRegister);
    const isUpdate = useAppSelector(state => state.user.isUpdate);
    const {user} = useAppSelector(state => state.user.session);

    const [pageType, setPageType] = useState<PagesType>("productComponent");

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

        <CardHeader w="100vw"  position="fixed" zIndex={2} pb={0}
                    bg={useColorModeValue('white', 'gray.900')}>
            <NavComponent
                isRegister={isRegister}
                setPageType={setPageType}
                setProductType={setProductType}
                productType={productType}
            />
            <FilterProductComponent
                getRoute={getRoute}
                setPageType={setPageType}
                pageType={pageType}
                productType={productType}
            />
        </CardHeader>
    );
};

export default Header;