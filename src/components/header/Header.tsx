import React, {memo, useEffect, useState} from 'react';
import {CardHeader, useColorModeValue} from "@chakra-ui/react";

import {useActionCreators, useAppSelector} from "@/hook";
import {AlertComponent, FilterProductComponent, NavComponent} from "@/components";
import {
    createdSelector,
    getAllRoomsForCurrentUserTC,
    getUserFromDBTC,
    isAuthSelector,
    isUpdateProfileSelector,
    messageProfileSelector,
    newMessageIdSelector,
    updateRoomStatusSelector,
    updateUserEffectSelector,
    userIdFromSessionSelector
} from "@/store";


type HeaderType = {
    getRoute: (route: string) => void
    setProductType: (type: string) => void
    productType: string
}

export type PagesType = 'productComponent' | 'profileSettings';

const Header: React.FC<HeaderType> = memo(({getRoute, setProductType, productType}) => {
    const [scrollTop, setScrollTop] = useState(0);
    const actions = useActionCreators({getUserFromDBTC, getAllRoomsForCurrentUserTC});
    const [pageType, setPageType] = useState<PagesType>("productComponent");
    const isAuth = useAppSelector(isAuthSelector);
    const userId = useAppSelector(userIdFromSessionSelector);
    const isUpdateProfile = useAppSelector(isUpdateProfileSelector);
    const updateUserEffect = useAppSelector(updateUserEffectSelector);
    const profileMessageFromAlertComponent = useAppSelector(messageProfileSelector);

    const roomExist = useAppSelector(createdSelector)
    const isRoomCreated = roomExist === "created";

    const updateRoomStatus = useAppSelector(updateRoomStatusSelector);
    const isRoomUpdated = updateRoomStatus === "updated";

    const newMessageId = useAppSelector(newMessageIdSelector);

    useEffect(() => {
        if (isAuth && userId) {
            actions.getUserFromDBTC(userId);
        }
    }, [userId, isAuth, updateUserEffect, newMessageId])

    useEffect(() => {
        if (userId) {
            actions.getAllRoomsForCurrentUserTC(userId)
        }
    }, [userId, isRoomCreated, isRoomUpdated])

    useEffect(() => {
        const handleScroll = (event: any) => {
            setScrollTop(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <CardHeader
            shadow={scrollTop > 100 ? "lg" : "none"}
            w="100%" position="fixed" zIndex={2}
            p={0}
            bg={useColorModeValue('white', 'gray.900')}
        >
            <NavComponent
                userId={userId}
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
            <AlertComponent status={isUpdateProfile} title={profileMessageFromAlertComponent} top={"94%"}/>
        </CardHeader>
    );
});

export default Header;