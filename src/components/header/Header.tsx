import React, {useEffect, useState} from 'react';
import {CardHeader, useColorModeValue} from "@chakra-ui/react";
import {getUserFromDBTC} from "@/store/slices/userReducer";
import {useActionCreators, useAppSelector} from "@/hook";
import {FilterProductComponent, NavComponent} from "@/components";
import {
    isAuthSelector,
    isUpdateProfileSelector,
    messageProfileSelector, updateUserEffectSelector, userIdFromSessionSelector,
} from "@/store/slices/userSelectors";
import AlertComponent from "@/components/alert/AlertComponent";

type HeaderType = {
    getRoute: (route: string) => void
    setProductType: (type: string) => void
    productType: string
}

export type PagesType = 'productComponent' | 'profileSettings'|"/";

const Header: React.FC<HeaderType> = ({getRoute, setProductType, productType}) => {

    const [pageType, setPageType] = useState<PagesType>("productComponent");
    const isAuth = useAppSelector(isAuthSelector);
    const userID = useAppSelector(userIdFromSessionSelector);
    const isUpdateProfile = useAppSelector(isUpdateProfileSelector);
    const updateUserEffect = useAppSelector(updateUserEffectSelector);
    const profileMessage = useAppSelector(messageProfileSelector);

    const actions = useActionCreators({getUserFromDBTC});

    useEffect(() => {
        if (userID && isAuth) {
            actions.getUserFromDBTC(userID);
        }
    }, [userID, isAuth, updateUserEffect])

    return (
        <CardHeader
            borderBottomWidth={1}
            borderStyle={'solid'}
            borderColor={useColorModeValue('gray.200', 'gray.700')}
            w="100%" position="fixed" zIndex={2} pb={0}
            bg={useColorModeValue('white', 'gray.900')}
        >
            <NavComponent
                isAuth={isAuth}
                setPageType={setPageType}
                setProductType={setProductType}

            />
            <FilterProductComponent
                getRoute={getRoute}
                setPageType={setPageType}
                pageType={pageType}
                productType={productType}
            />
            <AlertComponent status={isUpdateProfile} title={profileMessage} top={"94%"}/>
        </CardHeader>
    );
};

export default Header;