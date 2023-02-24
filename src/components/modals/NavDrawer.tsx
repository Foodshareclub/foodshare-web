import * as React from "react";
import {memo} from "react";
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


const NawDrawer: React.FC<ProfileSettingsProps> = memo(({
                                                            firstName,
                                                            secondName,
                                                            email,
                                                            size,
                                                            isAuth,
                                                            imgUrl,
                                                            navigateToHelp,
                                                            navigateToLogout,
                                                            navigateToMyLists,
                                                            navigateToAboutUs,
                                                            navigateToAccSettings,
                                                            navigateToMyMessages,
                                                            signalOfNewMessage
                                                        }) => {

    const {isOpen, onOpen, onClose} = useDisclosure()
    const handleClick = () => onOpen();

    return (
        <Box alignSelf={"center"}>
            {signalOfNewMessage.length ? <IconButton
                onClick={handleClick}
                key={size}
                variant='ghost'
                colorScheme='gray'
                aria-label='See menu'
                _after={{
                    content: '""',
                    w: 4,
                    h: 4,
                    bg: 'green.300',
                    border: '2px solid white',
                    rounded: 'full',
                    pos: 'absolute',
                    bottom: 0,
                    right: 0,
                }}
                icon={<DragHandleIcon/>}
            /> : <IconButton
                onClick={handleClick}
                key={size}
                variant='ghost'
                colorScheme='gray'
                aria-label='See menu'
                icon={<DragHandleIcon/>}
            />}
            <Drawer onClose={onClose} isOpen={isOpen} size={size}>
                <DrawerOverlay/>
                <DrawerContent>
                    <DrawerCloseButton/>
                    <DrawerHeader><Trans>{`Hi ${firstName}`}</Trans></DrawerHeader>
                    <DrawerBody>
                        <MinifiedUserInfo
                            src={imgUrl}
                            firstName={firstName}
                            secondName={secondName}
                            description={email}
                        />
                        <Box mt={10}>
                            {
                                isAuth
                                    ? <Stack spacing={3}>
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
                                              }}>{signalOfNewMessage.length ?
                                            <Trans>You have {signalOfNewMessage.length} messages</Trans> :
                                            <Trans>My messages</Trans>}
                                        </Text>


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
})
export default NawDrawer




