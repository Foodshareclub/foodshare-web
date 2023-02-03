import straw from "../../assets/straw.svg";
import * as React from 'react';
import {useEffect} from 'react';
import {useNavigate} from "react-router-dom";
import {Avatar, Box, Flex, Text} from "@chakra-ui/react";
import {PagesType} from "./Header";
import {useActionCreators, useAppSelector, useMediaQuery} from "@/hook";
import {AllValuesType} from "@/api/profileAPI";
import {BecomeSharerBlock, NavDrawer, ProfileSettings} from "@/components";
import {downloadImgFromDBTC, logoutTC} from "@/store/slices/userReducer";
import {avatarURLSelector, imgURLSelector} from "@/store/slices/userSelectors";
import PopoverForSearch from "@/pages/searchResultPage/PopoverForSearch";
import {PATH} from "@/utils";

type PropsLangType = {
    isAuth: boolean
    setPageType: (pageType: PagesType) => void
    setProductType: (type: string) => void

}
export type ProfileSettingsProps = {
    navigateToAboutUs: () => void
    navigateToMyLists: () => void
    navigateToLogout: () => void
    navigateToAccSettings: () => void
    navigateToHelp: () => void
    imgUrl: string
    value?: AllValuesType
    isAuth: boolean
    size?: string
    giveLanguage?: (value: string) => void

}

const NavComponent: React.FC<PropsLangType> = ({
                                                   isAuth, setPageType, setProductType
                                               }) => {
    const imgUrl = useAppSelector(imgURLSelector);
    const value = useAppSelector<AllValuesType>(state => state.user.value);
    const avatarURL = useAppSelector(avatarURLSelector);
    const actions = useActionCreators({downloadImgFromDBTC,logoutTC})

    useEffect(() => {
        if (value && value.avatar_url) {
            actions.downloadImgFromDBTC({
                dir: "avatars",
                imgUrl: avatarURL
            });
        }
    }, [value]); ////// НЕПРАВИЛЬНАЯ РАБОТА

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
                        value={value}
                        size={'md'} isAuth={isAuth}
                        imgUrl={imgUrl}
                        navigateToMyLists={navigateToMyLists}
                        navigateToLogout={navigateToLogout}
                        navigateToHelp={navigateToHelp}
                        navigateToAboutUs={navigateToAboutUs}
                        navigateToAccSettings={navigateToAccountSettings}/>
                    : <ProfileSettings
                        navigateToAccSettings={navigateToAccountSettings}
                        navigateToAboutUs={navigateToAboutUs}
                        navigateToMyLists={navigateToMyLists}
                        navigateToLogout={navigateToLogout}
                        navigateToHelp={navigateToHelp}
                        imgUrl={imgUrl}
                        isAuth={isAuth}
                    />
            }
        </Flex>
    );
}
export default NavComponent