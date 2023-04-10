import React, {useEffect, useState} from 'react';
import {
    Box,
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    Button,
    Container,
    Flex,
    Heading,
    Input,
    Popover,
    PopoverArrow,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
    Text,
    useColorModeValue
} from "@chakra-ui/react";
import {ChevronRightIcon} from "@chakra-ui/icons";
import {PATH} from "@/utils";
import {useNavigate} from "react-router-dom";
import {useActionCreators, useAppSelector} from "@/hook";
import {recoveryPasswordTC, userEmailFromSessionSelector} from "@/store";


export const LoginSecurityPage = () => {
    const actions = useActionCreators({recoveryPasswordTC})
    const navigate = useNavigate();
    const userEmail = useAppSelector(userEmailFromSessionSelector);
    const [edit, setEdit] = useState(false);
    const [isPushed, setIsPushed] = useState(false);
    const [email, setEmail] = useState(userEmail || '');

    let timerID: any;
    useEffect(() => {
        return () => timerID
    }, []);


    const sendEmailHandler = () => {
        actions.recoveryPasswordTC(email);
        setIsPushed(true);

        timerID = setTimeout(() => {
            setIsPushed(false)
        }, 1000)
    }

    return (
        <Container mt="23vh" maxW={"container.md"}>
            <Breadcrumb spacing='8px' separator={<ChevronRightIcon color='gray.800'/>}>
                <BreadcrumbItem
                    fontWeight='medium'
                    onClick={() => navigate(PATH.settingsPage)}
                >
                    <BreadcrumbLink>Account settings</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbItem isCurrentPage fontWeight='medium'>
                    <span>Login & security</span>
                </BreadcrumbItem>
            </Breadcrumb>
            <Box mt={"8vh"}>
                <Text fontSize='4xl' fontWeight={"bold"}>
                    Login & security
                </Text>
                <Flex borderBottomWidth={1}
                      borderStyle={'solid'}
                      borderColor={useColorModeValue('gray.200', 'gray.700')}>
                    <Box width={"container.lg"}>
                        <Heading fontSize={'2xl'} fontFamily={'body'}
                                 fontWeight={500} pb={2} color={"black.500"} textAlign='left' mb={2}>
                            Change password
                        </Heading>
                        {edit ? <>
                            <Text mb={5}>Insert your email and you'll receive a link to change the password</Text>
                            <Flex justifyContent={"space-between"}>
                                <Input
                                    value={email}
                                    onChange={(e) => setEmail(e.currentTarget.value)}
                                    variant="filled"
                                />
                            </Flex>
                            <Popover placement='bottom-start'>
                                <PopoverTrigger>
                                    <Button
                                        onClick={sendEmailHandler}
                                        variant={"ghost"}
                                        my={3}
                                        disabled={isPushed}
                                    >
                                        Send
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent w={'100%'}>
                                    <PopoverArrow/>
                                    <PopoverBody>
                                        Please check your e-mail.
                                    </PopoverBody>
                                </PopoverContent>
                            </Popover>
                        </> : <></>
                        }


                    </Box>
                    <Button
                        alignSelf={"top"}
                        onClick={() => {
                            setEdit(!edit)
                        }}
                        cursor={"pointer"}
                        variant={"ghost"}
                    >
                        {edit ? 'Cancel' : 'Edit'}
                    </Button>
                </Flex>

            </Box>
        </Container>
    );
};

