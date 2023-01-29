import straw from "../../assets/straw.svg";
import * as React from 'react';
import {useEffect} from 'react';
import {useNavigate} from "react-router-dom";
import {Avatar, Box, Flex, Text} from "@chakra-ui/react";
import {PagesType} from "./Header";
import {useAppDispatch, useAppSelector} from "@/hook";
import {AllValuesType} from "@/api/profileAPI";
import {useMediaQuery} from "@/utils";
import {NavDrawer, ProfileSettings} from "@/components";
import {downloadImgFromDBTC, logoutTC} from "@/store/slices/userReducer";
import {avatarURLSelector, imgURLSelector} from "@/store/slices/userSelectors";
import PopoverForSearch from "@/pages/searchResultPage/PopoverForSearch";

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

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (value && value.avatar_url) {
            dispatch(downloadImgFromDBTC({
                dir: "avatars",
                imgUrl: avatarURL
            }))
        }
    }, [value]); ////// НЕПРАВИЛЬНАЯ РАБОТА

    const isSmallerThan800 = useMediaQuery('(min-width:800px)');

    const navigate = useNavigate();

    const navigateToMain = () => {
        setProductType('food');
        navigate('/');
        setPageType('productComponent');

    }

    const navigateToAboutUs = () => navigate('/aboutUs');
    const navigateToMyLists = () => {
        navigate('/user-listings');
        setPageType("profileSettings");
    }

    const navigateToAccSettings = () => {
        setPageType("profileSettings");
    }
    const navigateToHelp = () => {
        setPageType("profileSettings");
    }

    const navigateToLogout = () => {
        dispatch(logoutTC());
        setPageType("profileSettings");
    }

    return (
        <Flex justify={"space-between"}>
            <Flex>
                <Avatar alignSelf="center"
                        src={straw}
                />

                <Box pl={3} alignSelf="center">
                    <Text onClick={() => navigateToMain()}
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
            {/*<SearchField/>*/}

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
                        navigateToAccSettings={navigateToAccSettings}/>
                    : <ProfileSettings
                        navigateToAccSettings={navigateToAccSettings}
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


