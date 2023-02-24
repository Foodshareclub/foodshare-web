import straw from "../../assets/straw.svg";
import * as React from 'react';
import {memo} from 'react';
import {useNavigate} from "react-router-dom";
import {Avatar, Box, Flex, Text} from "@chakra-ui/react";
import {PagesType} from "./Header";
import {useActionCreators, useAppSelector, useMediaQuery} from "@/hook";
import {BecomeSharerBlock, NavDrawer, ProfileSettings} from "@/components";
import {downloadImgFromDBTC, logoutTC} from "@/store/slices/userReducer";
import {
    avatarURLSelector,
    userEmailSelector,
    userFirstNameSelector,
    userSecondNameSelector
} from "@/store/slices/userSelectors";
import PopoverForSearch from "@/pages/searchResultPage/PopoverForSearch";
import {PATH} from "@/utils";
import {allRoomsSelector} from "@/store";

type PropsLangType = {
    isAuth: boolean
    setPageType: (pageType: PagesType) => void
    setProductType: (type: string) => void
    userId: string
}
export type ProfileSettingsProps = {
    signalOfNewMessage: boolean
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

    const signalOfNewMessage = allUserRooms.some(room => room.last_message_seen_by === userId);
    // console.log(signalOfNewMessage)

    const email = useAppSelector(userEmailSelector);
    const actions = useActionCreators({downloadImgFromDBTC, logoutTC});
    const isSmallerThan800 = useMediaQuery('(min-width:800px)');
    const navigate = useNavigate();

    const navigateToMain = () => {
        setProductType('food');
        navigate(PATH.main);
        setPageType('productComponent');
    }

    const navigateToAboutUs = () => navigate('/aboutUs');
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
    }

    const navigateToLogout = () => {
        actions.logoutTC();
        navigate(PATH.main);
    }

    return (
        <Flex justify={"space-between"}>
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
    );
})
export default NavComponent