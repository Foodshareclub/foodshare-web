import React, {useEffect, useState} from 'react';
import {CardHeader, useColorModeValue} from "@chakra-ui/react";
import {getValueFromDBTC} from "@/store/slices/userReducer";
import {useAppDispatch, useAppSelector} from "@/hook";
import {FilterProductComponent, NavComponent} from "@/components";
import {isAuthSelector, isRegisterSelector, userIdFromSessionSelector} from "@/store/slices/userSelectors";

type HeaderType = {
    getRoute: (route: string) => void
    setProductType: (type: string) => void
    productType: string
}

export type PagesType = 'productComponent' | 'profileSettings';

const Header: React.FC<HeaderType> = ({getRoute, setProductType, productType}) => {
    const dispatch = useAppDispatch();

    const isRegister = useAppSelector(isRegisterSelector);
    const isAuth = useAppSelector(isAuthSelector);
    const userId = useAppSelector(userIdFromSessionSelector);

    const [pageType, setPageType] = useState<PagesType>("productComponent");

    useEffect(() => {
        if (userId && isAuth) {
            const values = {
                fromTableName: "profiles",
                columnValue: 'id',
                columnValueItem: userId,
                selectRow: "*"
            }
            dispatch(getValueFromDBTC(values));
        }
    }, [userId, isAuth])

    return (

        <CardHeader w="100%" position="fixed" zIndex={2} pb={0}
                    bg={useColorModeValue('white', 'gray.900')}
        >
            <NavComponent
                isRegister={isRegister}
                setPageType={setPageType}
                setProductType={setProductType}

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