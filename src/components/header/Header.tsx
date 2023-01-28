import React, {useEffect, useState} from 'react';
import {CardHeader, useColorModeValue} from "@chakra-ui/react";
import {getValueFromDBTC} from "@/store/slices/userReducer";
import {useAppDispatch, useAppSelector} from "@/hook";
import {FilterProductComponent, NavComponent} from "@/components";
import {
    isRegisterSelector,
    isUpdateSelector,
    userIdFromSessionSelector,
    userIdSelector
} from "@/store/slices/userSelectors";

type HeaderType = {
    getRoute: (route: string) => void
    setProductType: (type: string) => void
    productType: string
}

export type PagesType = 'productComponent' | 'profileSettings';

const Header: React.FC<HeaderType> = ({getRoute, setProductType, productType}) => {
    const dispatch = useAppDispatch();

    const isRegister = useAppSelector(isRegisterSelector);
    const isUpdate = useAppSelector(isUpdateSelector);
    const userId = useAppSelector(userIdFromSessionSelector);

    const [pageType, setPageType] = useState<PagesType>("productComponent");

    useEffect(() => {
        if (userId) {
            const values = {
                fromTableName: "profiles",
                columnValue: 'id',
                columnValueItem: userId,
                selectRow: "*"
            }
            dispatch(getValueFromDBTC(values));
        }
    }, [userId, isUpdate])

    return (

        <CardHeader w="100%"  position="fixed" zIndex={2} pb={0}
                    bg={useColorModeValue('white', 'gray.900')}
        >
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