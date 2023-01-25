import straw from "../../assets/straw.svg";
import * as React from 'react';
import {useEffect} from 'react';
import {useNavigate} from "react-router-dom";
import {Avatar, Box, Flex, Input, InputGroup, InputLeftElement, Text} from "@chakra-ui/react";
import {SearchIcon} from "@chakra-ui/icons";
import {t} from "@lingui/macro";
import {PagesType} from "./Header";
import {useAppDispatch, useAppSelector} from "@/hook";
import {AllValuesType} from "@/api/profileAPI";
import {useMediaQuery} from "@/utils";
import {NavDrawer, ProfileSettings} from "@/components";
import {downloadImgFromDBTC, logoutTC} from "@/store/slices/userReducer";

type PropsLangType = {
    isRegister: boolean
    productType: string
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
    isRegister: boolean
    size?: string
    giveLanguage?: (value: string) => void

}

const NavComponent: React.FC<PropsLangType> = ({
                                                   isRegister, setPageType, setProductType, productType
                                               }) => {

    const imgUrl = useAppSelector(state => state.user.imgUrl);
    const value = useAppSelector<AllValuesType>(state => state.user.value);

    const dispatch = useAppDispatch();

    // const size = ['xs', 'sm', 'md', 'lg', 'xl', 'full'];

    useEffect(() => {
        if (value && value.avatar_url) {
            dispatch(downloadImgFromDBTC({
                dir: "avatars",
                imgUrl: value && value.avatar_url
            }))
        }
    }, [value])

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
        <Flex  justify={"space-between"}>
            <Flex>
                <Avatar alignSelf="center"
                        src={straw}/>

                <Box pl={3} alignSelf="center">
                    <Text onClick={() => navigateToMain()} cursor="pointer"
                          fontSize="25px" fontWeight={900} textTransform="uppercase" color='#FF2D55'>
                        foodShare
                    </Text>
                </Box>
            </Flex>
            <InputGroup alignSelf="center" w={"50%"} ml={"6%"} alignItems="center">
                <InputLeftElement
                    pointerEvents='none'
                    children={<SearchIcon color='gray.300'/>}
                />
                <Input focusBorderColor='#FF2D55' type='search' placeholder={t({
                    id:`msg.Input`,
                    message:`What are we in search of today?`
                })}/>
            </InputGroup>

            {
                !isSmallerThan800
                    ? <NavDrawer
                        value={value}
                        size={'md'} isRegister={isRegister}
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
                        isRegister={isRegister}
                    />
            }
        </Flex>
    );
}
export default NavComponent


