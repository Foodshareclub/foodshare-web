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
import {t, Trans} from "@lingui/macro";
import UpdateProfileModal from "./UpdateProfileModal";
import {loginTC, registerTC} from "@/store/slices/userReducer";
import {ProfileSettingsProps} from "@/components/header/NavComponent";
import {AuthenticationUserModal} from "@/components";


const NawDrawer: React.FC<ProfileSettingsProps> = ({
                                                       size,
                                                       isAuth,
                                                       imgUrl,
                                                       navigateToHelp,
                                                       navigateToLogout,
                                                       navigateToMyLists,
                                                       navigateToAboutUs,
                                                       navigateToAccSettings,
                                                       value
                                                   }) => {

    const {isOpen, onOpen, onClose} = useDisclosure()


    const handleClick = () => onOpen();

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
                    <DrawerHeader><Trans>{`Hi ${value && value.first_name}`}</Trans></DrawerHeader>
                    <DrawerBody>
                        <Flex flex='1' gap='4' alignItems='center' flexWrap='wrap'>
                            <Avatar name={value && value.first_name} src={imgUrl}/>
                            <Box>
                                <Heading size='sm'>{value && value.first_name} {value && value.second_name}</Heading>
                                <Text>{value && value.about_me}</Text>
                            </Box>
                        </Flex>
                        <Box mt={10}>
                            {
                                isAuth
                                    ?
                                    <Stack spacing={3}>
                                        <UpdateProfileModal fullScreen={false} buttonValue={t`Edit profile`}/>
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => {
                                                  onClose()
                                                  navigateToMyLists()
                                              }}><Trans>My listing's</Trans></Text>
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => navigateToAccSettings()}><Trans>Account settings</Trans></Text>
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => navigateToLogout()}><Trans>Log Out</Trans></Text>

                                    </Stack>
                                    : <Stack>
                                        <AuthenticationUserModal buttonValue="Login" thunk={loginTC} fullScreen={false}/>
                                        <AuthenticationUserModal buttonValue="Registration" thunk={registerTC}
                                                                 fullScreen={false}/>
                                    </Stack>
                            }
                            <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                  onClick={() => {
                                      onClose()
                                      navigateToAboutUs()
                                  }}><Trans>About Us</Trans></Text>
                            <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                  onClick={() => navigateToHelp()}><Trans>Help</Trans></Text>
                        </Box>

                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </Box>
    )
}
export default NawDrawer