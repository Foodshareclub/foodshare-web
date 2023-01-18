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
    Stack,
    Text,
    useDisclosure
} from "@chakra-ui/react";
import {DragHandleIcon} from "@chakra-ui/icons";
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
                                                       navigateToAccSettings,
                                                       value
                                                   }) => {

    const {isOpen, onOpen, onClose} = useDisclosure()


    const handleClick = () => {
        onOpen()
    }

    // const size = ['xs', 'sm', 'md', 'lg', 'xl', 'full']

    return (
        <Box alignSelf={"center"}>
            <IconButton
                onClick={handleClick}
                key={size}
                variant='ghost'
                colorScheme='gray'
                aria-label='See menu'
                icon={<DragHandleIcon/>}
            />
            <Drawer onClose={onClose} isOpen={isOpen} size={size}>
                <DrawerOverlay/>
                <DrawerContent>
                    <DrawerCloseButton/>
                    <DrawerHeader>{`Hi ${value && value.first_name}`}</DrawerHeader>
                    <DrawerBody>
                        <Flex flex='1' gap='4' alignItems='center' flexWrap='wrap'>
                            <Avatar name={value && value.first_name} src={imgUrl}/>
                            <Box>
                                <Heading size='sm'>{value && value.first_name} {value && value.second_name}</Heading>
                                <Text>Creator, Chakra UI</Text>
                            </Box>
                        </Flex>
                        <Box mt={10}>
                            {
                                isRegister
                                    ?
                                    <Stack spacing={3}>
                                        <UpdateProfileModal fullScreen={false} buttonValue="Update Profile"/>
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => navigateToMyLists()}>My listing's</Text>
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => navigateToAccSettings()}>Account
                                            settings</Text>
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => navigateToLogout()}>Log Out</Text>

                                    </Stack>
                                    : <Stack>
                                        <AuthenticationUserModal buttonValue="Login" thunk={loginTC} fullScreen={false}/>
                                        <AuthenticationUserModal buttonValue="Registration" thunk={registerTC}
                                                                 fullScreen={false}/>
                                    </Stack>
                            }
                            <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                  onClick={() => navigateToAboutUs()}>About Us</Text>
                            <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                  onClick={() => navigateToHelp()}>Help</Text>
                        </Box>

                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </Box>
    )
}
export default NawDrawer