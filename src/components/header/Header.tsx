import React, {memo, useEffect, useState} from 'react';
import {CardHeader, useColorModeValue} from "@chakra-ui/react";
import {getUserFromDBTC} from "@/store/slices/userReducer";
import {useActionCreators, useAppSelector} from "@/hook";
import {FilterProductComponent, NavComponent} from "@/components";
import {
    isAuthSelector,
    isUpdateProfileSelector,
    messageProfileSelector,
    sessionSelector,
    updateUserEffectSelector,
} from "@/store/slices/userSelectors";
import AlertComponent from "@/components/alert/AlertComponent";
import {getAllRoomsForCurrentUserTC} from "@/store/slices/chatReducer";
import {createdSelector, updateRoomStatusSelector} from "@/store";
import {newMessageIdSelector} from "@/store/slices/chatSelectors";

type HeaderType = {
    getRoute: (route: string) => void
    setProductType: (type: string) => void
    productType: string
}

export type PagesType = 'productComponent' | 'profileSettings' | "/";

const Header: React.FC<HeaderType> = memo(({getRoute, setProductType, productType}) => {
    const actions = useActionCreators({getUserFromDBTC, getAllRoomsForCurrentUserTC});
    const [pageType, setPageType] = useState<PagesType>("productComponent");
    const isAuth = useAppSelector(isAuthSelector);
    const session = useAppSelector(sessionSelector);
    const userId = session?.user?.id;
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

    return (
        <CardHeader
            borderBottomWidth={1}
            borderStyle={'solid'}
            borderColor={useColorModeValue('gray.200', 'gray.700')}
            w="100%" position="fixed" zIndex={2} pb={0}
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