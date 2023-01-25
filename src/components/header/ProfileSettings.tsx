import * as React from "react";
import {Avatar, Box, Menu, MenuButton, MenuItem, MenuList} from "@chakra-ui/react";
import UpdateProfileModal from "../modals/UpdateProfileModal";

import {t, Trans} from "@lingui/macro";
import {loginTC, registerTC} from "@/store/slices/userReducer";
import {ProfileSettingsProps} from "@/components/header/NavComponent";
import {AuthenticationUserModal} from "@/components";


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
                                        id: `Update Profile`,
                                        message: `Update Profile`
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