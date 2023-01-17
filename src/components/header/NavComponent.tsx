import straw from "../../assets/straw.svg";
import * as React from 'react';
import {useEffect} from 'react';
import {useNavigate} from "react-router-dom";
import {Avatar, Box, Input, InputGroup, InputLeftElement, Text} from "@chakra-ui/react";
import {SearchIcon} from "@chakra-ui/icons";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {downloadImgFromDBTC, logoutTC} from "../../store/slices/userReducer";
import {AllValuesType} from "../../api/profileAPI";
import useMediaQuery from "../../utils/useMediaQuery";
import NavDrawer from "../modals/NavDrawer";
import ProfileSettings from "./ProfileSettings";

type PropsType = {
    isRegister: boolean

}
export type ProfileSettingsProps = {
    navigateToAboutUs: () => void
    navigateToMyLists: () => void
    navigateToLogout: () => void
    navigateToAccSettings: () => void
    navigateToHelp: () => void
    imgUrl: string
    isRegister: boolean
    size?: string
}
const NavComponent: React.FC<PropsType> = ({isRegister}) => {

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
    const navigateToMain = () => navigate('/');
    const navigateToAboutUs = () => navigate('/aboutUs');
    const navigateToMyLists = () => navigate('/user-listings');

    const navigateToAccSettings = () => {
    }

    const navigateToHelp = () => {
    }
    const navigateToLogout = () => {
        dispatch(logoutTC())
    }


    return (
        <Box display='flex'  justifyContent={"space-between"}>
            <Avatar alignSelf="center"
                    src={straw}/>
            <Box pl={3} alignSelf="center">
                <Text onClick={() => navigateToMain()} cursor="pointer"
                      fontSize="25px" fontWeight={900} textTransform="uppercase" color='#FF2D55'>
                    foodShare
                </Text>
            </Box>

            <InputGroup alignSelf="center" w={"50%"} ml={"6%"} alignItems="center">
                <InputLeftElement
                    pointerEvents='none'
                    children={<SearchIcon color='gray.300'/>}
                />
                <Input focusBorderColor='#FF2D55' type='search' placeholder='What are we in search of today?'/>
            </InputGroup>

            {
                !isSmallerThan800
                    ? <NavDrawer
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
        </Box>
    );
}
export default NavComponent


