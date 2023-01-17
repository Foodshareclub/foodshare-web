import * as React from "react";
import {
    Avatar,
    Box,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Flex,
    Heading,
    IconButton,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Text,
    useDisclosure
} from "@chakra-ui/react";
import {HamburgerIcon} from "@chakra-ui/icons";
import UpdateProfileModal from "./UpdateProfileModal";

import {ProfileSettingsProps} from "../header/NavComponent";
import {loginTC, registerTC} from "../../store/slices/userReducer";
import AuthenticationUserModal from "./AuthenticationUser/AuthenticationUserModal";


const NawDrawer: React.FC<ProfileSettingsProps> = ({
                                                       size,
                                                       isRegister,
                                                       imgUrl,
                                                       navigateToHelp,
                                                       navigateToLogout,
                                                       navigateToMyLists,
                                                       navigateToAboutUs,
                                                       navigateToAccSettings
                                                   }) => {

    const {isOpen, onOpen, onClose} = useDisclosure()


    const handleClick = () => {
        onOpen()
    }

    // const size = ['xs', 'sm', 'md', 'lg', 'xl', 'full']

    return (
        <>
            <IconButton
                onClick={handleClick}
                key={size}
                variant='ghost'
                colorScheme='gray'
                aria-label='See menu'
                icon={<HamburgerIcon/>}
            />
            <Drawer onClose={onClose} isOpen={isOpen} size={size}>
                <DrawerOverlay/>
                <DrawerContent>
                    <DrawerCloseButton/>
                    <DrawerHeader>{`Hi ${size}`}</DrawerHeader>
                    <DrawerBody>
                        <Flex>
                            <Flex flex='1' gap='4' alignItems='center' flexWrap='wrap'>
                                <Avatar name='Avatar' src={imgUrl}/>
                                <Box>
                                    <Heading size='sm'>Segun Adebayo</Heading>
                                    <Text>Creator, Chakra UI</Text>
                                </Box>
                            </Flex>
                            <Menu>
                                <MenuButton
                                    cursor="pointer"
                                    borderRadius="50%"
                                    icon={<HamburgerIcon/>}
                                    as={HamburgerIcon}>
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

                        </Flex>
                        <Box onClick={() => navigateToAboutUs()} cursor="pointer" fontSize='22px' textAlign="center"
                             _hover={{color: "#FF2D55"}}
                             fontWeight="400"
                             alignSelf="center" w="40%"
                             color='#303030'>
                            About Us
                        </Box>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </>
    )
}
export default NawDrawer