import React, {useState} from "react";
import {Box, Button, Flex, Heading, Input, Text, useColorModeValue} from "@chakra-ui/react";

type EmailBlockType = {
    email: string
    setEmail: (newEmail: string) => void
    onSaveHandler: () => void
    a: boolean
    c: boolean
    d: boolean
    b: boolean
    setA: (value: boolean) => void
    setC: (value: boolean) => void
    setD: (value: boolean) => void
}

export const EmailBlock: React.FC<EmailBlockType> = ({
                                                         email,
                                                         onSaveHandler,
                                                         a,
                                                         c,
                                                         d,
                                                         b,
                                                         setD,
                                                         setC,
                                                         setA,
                                                         setEmail
                                                     }) => {
    const [edit, setEdit] = useState(false);

    return (
        <Flex  borderBottomWidth={1}
               borderStyle={'solid'}
               borderColor={useColorModeValue('gray.200', 'gray.700')} >
            <Box width={"container.lg"}>
                <Heading fontSize={'2xl'} fontFamily={'body'}
                         fontWeight={500} pb={2} color={b ? "gray.100" : "black.500"} textAlign='left'>
                    Email address
                </Heading>
                {
                    edit
                        ? <>
                            <Flex justifyContent={"space-between"}>
                                <Input
                                    value={email}
                                    onChange={(e) => {
                                    }}
                                    variant="filled"
                                />

                            </Flex>
                            <Button
                                onClick={onSaveHandler}
                                variant={"ghost"}
                                my={3}
                            >Save
                            </Button>
                        </>
                        : <Text color={b ? "gray.100" : "black.500"}>
                            {email}
                        </Text>
                }
            </Box>
            <Button
                alignSelf={"top"}
                disabled={b}
                onClick={() => {
                    setA(!a)
                    setD(!d)
                    setC(!c)
                    setEdit(!edit)
                }}
                cursor={"pointer"}
                variant={"ghost"}
            >
                {edit ? 'Cancel' : 'Edit'}
            </Button>
        </Flex>

    );
};
