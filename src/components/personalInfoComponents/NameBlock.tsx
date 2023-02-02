import React, {useState} from "react";
import {Box, Button, Flex, Heading, Input, Text, useColorModeValue} from "@chakra-ui/react";

type NameBlockType = {
    firstName: string
    setFirstName: (firstName: string) => void
    secondName: string
    setSecondName: (secondName: string) => void
    onSaveHandler: () => void
    b: boolean
    c: boolean
    d: boolean
    a: boolean
    setB: (value: boolean) => void
    setC: (value: boolean) => void
    setD: (value: boolean) => void
}

export const NameBlock: React.FC<NameBlockType> = ({
                                                       setB, setC, setD, a, b, c, d,
                                                       firstName,
                                                       setFirstName,
                                                       secondName,
                                                       setSecondName,
                                                       onSaveHandler
                                                   }) => {
    const [edit, setEdit] = useState(false);

    return (
        <Flex  borderBottomWidth={1}
               borderStyle={'solid'}
               borderColor={useColorModeValue('gray.200', 'gray.700')} >
            <Box width={"container.lg"}>
                <Heading fontSize={'2xl'} fontFamily={'body'}
                         fontWeight={500} pb={2} color={a ? "gray.100" : "black.500"}>
                    Name
                </Heading>
                {
                    edit
                        ? <>
                            <Flex justifyContent={"space-between"}>
                                <Input
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.currentTarget.value)}
                                    variant="filled"
                                />

                                <Input
                                    value={secondName}
                                    onChange={(e) => setSecondName(e.currentTarget.value)}
                                    variant="filled"
                                    ml={5}
                                />
                            </Flex>
                            <Button
                                onClick={onSaveHandler}
                                variant={"ghost"}
                                my={3}
                            >Save
                            </Button>
                        </>
                        : <Text color={a ? "gray.100" : "black.500"}>
                            {firstName} {secondName}
                        </Text>
                }
            </Box>
            <Button
                alignSelf={"top"}
                disabled={a}
                onClick={() => {
                    setB(!b);
                    setC(!c);
                    setD(!d);
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
