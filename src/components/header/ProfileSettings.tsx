import * as React from "react";
import {Avatar, Box, Button, Image, Menu, MenuButton, MenuItem, MenuList} from "@chakra-ui/react";
import {ChevronDownIcon} from "@chakra-ui/icons";
import map from "../../assets/globus.svg";
import UpdateProfileModal from "../modals/UpdateProfileModal";

import {ProfileSettingsProps} from "./NavComponent";
import {loginTC, registerTC} from "../../store/slices/userReducer";
import AuthenticationUserModal from "../modals/AuthenticationUserModal";

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
            <Box onClick={() => navigateToAboutUs()} cursor="pointer" fontSize='22px' textAlign="center"
                 _hover={{color: "#FF2D55"}}
                 fontWeight="400"
                 alignSelf="center" w="40%"
                 color='#303030'>
                About Us
            </Box>
            <Box alignSelf="center" p={0} color='#303030'>
                <Menu>
                    <MenuButton _expanded={{bg: 'gray.100', color: "#FF2D55"}}
                                _hover={{bg: 'gray.100', color: "#FF2D55"}}
                                variant="styled" as={Button}
                                rightIcon={<ChevronDownIcon/>}>
                    </MenuButton>
                    <MenuList>
                        <MenuItem>Download</MenuItem>
                        <MenuItem>Create a Copy</MenuItem>
                        <MenuItem>Mark as Draft</MenuItem>
                        <MenuItem>Delete</MenuItem>
                        <MenuItem>Attend a Workshop</MenuItem>
                    </MenuList>
                </Menu>
            </Box>
            <Box fontWeight={400} fontSize='22px' alignSelf="center" w='30%' color='#303030'>
                Filters
            </Box>
            <Image mr="5%" alignSelf="center" src={map} alt={map}/>
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
                                    <UpdateProfileModal buttonValue="Update Profile"/>
                                    <MenuItem onClick={() => navigateToMyLists()}>My listing's</MenuItem>
                                    <MenuItem onClick={() => navigateToLogout()}>Log Out</MenuItem>
                                </>
                                : <>
                                    <AuthenticationUserModal buttonValue="Login" thunk={loginTC}/>
                                    <AuthenticationUserModal buttonValue="Registration" thunk={registerTC}/>

                                </>
                        }
                        <MenuItem onClick={() => navigateToAccSettings()}>Account settings</MenuItem>
                        <MenuItem onClick={() => navigateToHelp()}>Help</MenuItem>
                    </MenuList>
                </Menu>
            </Box>
        </>
    )
}
export default ProfileSettings