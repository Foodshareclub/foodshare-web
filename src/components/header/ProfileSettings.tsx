import * as React from "react";
import map from "../../assets/globus.svg"
import {Avatar, Box, Image, Menu, MenuButton, MenuItem, MenuList} from "@chakra-ui/react";
import UpdateProfileModal from "../modals/UpdateProfileModal";

import {ProfileSettingsProps} from "./NavComponent";
import {loginTC, registerTC} from "../../store/slices/userReducer";
import AuthenticationUserModal from "../modals/AuthenticationUser/AuthenticationUserModal";
import LanguageSelector from "../languageSelector/LanguageSelector";
import {t, Trans} from "@lingui/macro";


const ProfileSettings: React.FC<ProfileSettingsProps> = ({
                                                             navigateToMyLists,
                                                             navigateToHelp,
                                                             navigateToLogout,
                                                             navigateToAccSettings,
                                                             navigateToAboutUs,
                                                             imgUrl, isRegister
                                                         }) => {
    return (
        <>
            {/*<Image mr="5%" alignSelf="center" src={map} alt={map}/>*/}
            <LanguageSelector />
            <Box alignSelf="center" p={0} color='#303030'>
                <Menu>
                    <MenuButton
                        cursor="pointer"
                        borderRadius="50%"
                        icon={<Avatar src={imgUrl}/>}
                        as={Avatar}>
                    </MenuButton>
                    <MenuList>
                        {
                            isRegister
                                ? <>
                                    <UpdateProfileModal fullScreen={true} buttonValue={t({
                                        id:`Update Profile`,
                                        message:`Update Profile`
                                    })}/>
                                    <MenuItem onClick={() => navigateToMyLists()}><Trans>My listing's</Trans></MenuItem>
                                    <MenuItem onClick={() => navigateToLogout()}><Trans>Log Out</Trans></MenuItem>
                                </>
                                : <>
                                    <AuthenticationUserModal buttonValue="Login" thunk={loginTC} fullScreen/>
                                    <AuthenticationUserModal buttonValue="Registration" thunk={registerTC}
                                                             fullScreen/>

                                </>
                        }
                        <MenuItem onClick={() => navigateToAccSettings()}><Trans>Account settings</Trans></MenuItem>
                        <MenuItem onClick={() => navigateToHelp()}><Trans>Help</Trans></MenuItem>
                        <MenuItem onClick={() => navigateToAboutUs()}><Trans>About Foodshare</Trans></MenuItem>
                    </MenuList>
                </Menu>
            </Box>
        </>

    )
}
export default ProfileSettings