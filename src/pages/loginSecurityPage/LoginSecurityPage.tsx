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
    Text
} from "@chakra-ui/react";
import {ChevronRightIcon} from "@chakra-ui/icons";
import {PATH} from "@/utils";
import {useNavigate} from "react-router-dom";
import {useAppDispatch, useAppSelector} from "@/hook";
import {userEmailFromSessionSelector} from "@/store/slices/userSelectors";
import {recoveryPasswordTC} from "@/store/slices/userReducer";

export const LoginSecurityPage = () => {
    const dispatch = useAppDispatch();

    const navigate = useNavigate();

    const userEmail = useAppSelector(userEmailFromSessionSelector);

    const [isPushed, setIsPushed] = useState(false);
    const [email, setEmail] = useState(userEmail || '');

    let timerID: any;
    useEffect(() => {
        return () => timerID
    }, []);


    const sendEmailHandler = () => {
        dispatch(recoveryPasswordTC(email));
        setIsPushed(true);

        timerID = setTimeout(() => {
            setIsPushed(false)
        }, 1000)
    }

    return (
        <Box mt="23vh">

            <Container maxW={"container.md"}>
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

                <Text fontSize='4xl' fontWeight={"bold"}>
                    Login & security
                </Text>

                <Box mt={5}>
                    <Flex>
                        <Box width={"container.lg"}>
                            <Heading color={"gray.500"} textAlign='left' mb={2}>
                                Change password
                            </Heading>
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
                                        colorScheme={"blackAlpha"}
                                        variant={"solid"}
                                        mt={3}
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
                        </Box>
                    </Flex>

                </Box>

            </Container>
        </Box>
    );
};

