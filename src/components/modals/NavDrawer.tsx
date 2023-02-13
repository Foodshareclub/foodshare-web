import * as React from "react";
import {
    Box,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    IconButton,
    Stack,
    Text,
    useDisclosure
} from "@chakra-ui/react";
import {DragHandleIcon} from "@chakra-ui/icons";
import {Trans} from "@lingui/macro";
import {loginTC, registerTC} from "@/store/slices/userReducer";
import {ProfileSettingsProps} from "@/components/header/NavComponent";
import {AuthenticationUserModal, MinifiedUserInfo} from "@/components";


const NawDrawer: React.FC<ProfileSettingsProps> = ({
                                                       size,
                                                       isAuth,
                                                       imgUrl,
                                                       navigateToHelp,
                                                       navigateToLogout,
                                                       navigateToMyLists,
                                                       navigateToAboutUs,
                                                       navigateToAccSettings,
                                                       navigateToMyMessages,
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
                        <MinifiedUserInfo
                            src={imgUrl}
                            firstName={value?.first_name}
                            secondName={value?.second_name}
                            description={value?.about_me}
                        />
                        <Box mt={10}>
                            {
                                isAuth
                                    ? <Stack spacing={3}>
                                        {/*<UpdateProfileModal fullScreen={false} buttonValue={t`Edit profile`}/>*/}
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => {
                                                  onClose()
                                                  navigateToMyLists()
                                              }}><Trans>My listing's</Trans></Text>
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => {
                                                  onClose()
                                                  navigateToAccSettings()
                                              }}><Trans>Account settings</Trans></Text>
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => {
                                                  onClose()
                                                  navigateToMyMessages()
                                              }}><Trans>My messages</Trans></Text>
                                        <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl'
                                              onClick={() => {
                                                  onClose()
                                                  navigateToLogout()
                                              }}><Trans>Log Out</Trans></Text>

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




