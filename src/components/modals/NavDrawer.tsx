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
import {useNavigate} from "react-router-dom";
import {useAppDispatch} from "../../hook/hooks";
import UpdateProfileModal from "./UpdateProfileModal";
import LoginModal from "./LoginModal";
import {logoutTC} from "../../store/slices/userReducer";


type PropsType = {
    size: string
    isRegister: boolean
    imgUrl: string
}

const NawDrawer: React.FC<PropsType> = ({size, isRegister, imgUrl}) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch()
    const {isOpen, onOpen, onClose} = useDisclosure()


    const handleClick = () => {
        onOpen()
    }

    const navigateToRegistration = () => navigate('/registration');
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
    // const size = ['xs', 'sm', 'md', 'lg', 'xl', 'full']

    return (
        <>
            {/*<Button*/}
            {/*    onClick={handleClick}*/}
            {/*    key={size}*/}
            {/*    m={4}*/}
            {/*></Button>*/}
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
                            {/*<IconButton*/}
                            {/*    variant='ghost'*/}
                            {/*    colorScheme='gray'*/}
                            {/*    aria-label='See menu'*/}
                            {/*    icon={<HamburgerIcon/>}*/}
                            {/*/>*/}
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
                                                <LoginModal buttonValue="Login"/>
                                                <MenuItem onClick={() => navigateToRegistration()}>Registration</MenuItem>
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