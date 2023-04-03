import straw from "../../assets/straw.svg";
import * as React from 'react';
import {memo} from 'react';
import {useNavigate} from "react-router-dom";
import {Avatar, Box, Flex, Text, useColorModeValue} from "@chakra-ui/react";
import {PagesType} from "./Header";
import {useActionCreators, useAppSelector, useMediaQuery} from "@/hook";
import {BecomeSharerBlock, NavDrawer, ProfileSettings} from "@/components";

import {PATH} from "@/utils";
import {
    allRoomsSelector,
    avatarURLSelector,
    downloadImgFromDBTC,
    logoutTC,
    userEmailSelector,
    userFirstNameSelector,
    userSecondNameSelector
} from "@/store";
import {CustomRoomType} from "@/api/chatAPI";
import {PopoverForSearch} from "@/pages";

type PropsLangType = {
    isAuth: boolean
    setPageType: (pageType: PagesType) => void
    setProductType: (type: string) => void
    userId: string
}
export type ProfileSettingsProps = {
    signalOfNewMessage: Array<CustomRoomType>
    navigateToAboutUs: () => void
    navigateToMyLists: () => void
    navigateToLogout: () => void
    navigateToAccSettings: () => void
    navigateToHelp: () => void
    navigateToMyMessages: () => void
    imgUrl: string
    isAuth: boolean
    size?: string
    firstName?: string
    secondName?: string
    email?: string

}

const NavComponent: React.FC<PropsLangType> = memo(({
                                                        userId,
                                                        isAuth, setPageType,
                                                        setProductType
                                                    }) => {

    const imgUrl = useAppSelector(avatarURLSelector);
    const firstName = useAppSelector(userFirstNameSelector);
    const secondName = useAppSelector(userSecondNameSelector);
    const allUserRooms = useAppSelector(allRoomsSelector);

    const signalOfNewMessage = allUserRooms.filter(room => room.last_message_sent_by !== userId);

    const email = useAppSelector(userEmailSelector);
    const actions = useActionCreators({downloadImgFromDBTC, logoutTC});
    const isSmallerThan800 = useMediaQuery('(min-width:800px)');
    const navigate = useNavigate();

    const navigateToMain = () => {
        setProductType('food');
        navigate(PATH.mainFood);
    }

    const navigateToAboutUs = () => {
        navigate('/aboutUs');
        setPageType("profileSettings");
    }

    const navigateToMyLists = () => {
        navigate(PATH.myListingsPage);
        setPageType("profileSettings");
    }

    const navigateToAccountSettings = () => {
        setPageType("profileSettings");
        navigate(PATH.settingsPage);
    }
    const navigateToHelp = () => {
        setPageType("profileSettings");
    }
    const navigateToMyMessages = () => {
        navigate(`/chat-main`);
        setPageType("profileSettings");
    }

    const navigateToLogout = () => {
        actions.logoutTC();
        navigate('/food');
    }

    return (
        <Flex
            px={{xl: 20, base: 7}}
            py={3}
            borderBottomWidth={1}
            borderStyle={'solid'}
            borderColor={useColorModeValue('gray.200', 'gray.700')}
            justify={"space-between"}>
            <Flex>
                <Avatar alignSelf="center"
                        src={straw}
                />

                <Box pl={3} alignSelf="center">
                    <Text display={{"mm": "block", base: "none"}} onClick={() => navigateToMain()}
                          cursor="pointer"
                          fontSize="25px"
                          fontWeight={900}
                          textTransform="uppercase"
                          color='#FF2D55'
                    >
                        foodShare
                    </Text>
                </Box>
            </Flex>
            <PopoverForSearch/>
            <Flex>
                <BecomeSharerBlock/>
                {
                    !isSmallerThan800
                        ? <NavDrawer
                            signalOfNewMessage={signalOfNewMessage}
                            firstName={firstName}
                            secondName={secondName}
                            email={email}
                            size={'md'} isAuth={isAuth}
                            imgUrl={imgUrl}
                            navigateToMyLists={navigateToMyLists}
                            navigateToLogout={navigateToLogout}
                            navigateToHelp={navigateToHelp}
                            navigateToAboutUs={navigateToAboutUs}
                            navigateToMyMessages={navigateToMyMessages}
                            navigateToAccSettings={navigateToAccountSettings}/>
                        : <ProfileSettings
                            signalOfNewMessage={signalOfNewMessage}
                            navigateToAccSettings={navigateToAccountSettings}
                            navigateToAboutUs={navigateToAboutUs}
                            navigateToMyLists={navigateToMyLists}
                            navigateToLogout={navigateToLogout}
                            navigateToHelp={navigateToHelp}
                            navigateToMyMessages={navigateToMyMessages}
                            imgUrl={imgUrl}
                            isAuth={isAuth}
                        />
                }
            </Flex>
        </Flex>
    );
})
export default NavComponent