import React, {useState} from "react";
import {
    Box,
    Button,
    Flex,
    Heading,
    Input,
    InputGroup,
    InputLeftElement,
    Text,
    useColorModeValue
} from "@chakra-ui/react";
import {PhoneIcon} from "@chakra-ui/icons";

type PhoneNumberBlockType = {
    phone: string
    setPhone: (newNumber: string) => void
    onSaveHandler: () => void
    a: boolean
    b: boolean
    d: boolean
    c: boolean
    setA: (value: boolean) => void
    setB: (value: boolean) => void
    setD: (value: boolean) => void
}

export const PhoneNumberBlock: React.FC<PhoneNumberBlockType> = ({
                                                                     a,
                                                                     b,
                                                                     d,
                                                                     c,
                                                                     setD,
                                                                     setB,
                                                                     setA,
                                                                     onSaveHandler,
                                                                     setPhone, phone
                                                                 }) => {
    const [edit, setEdit] = useState(false);

    return (
        <Flex  borderBottomWidth={1}
               borderStyle={'solid'}
               borderColor={useColorModeValue('gray.200', 'gray.700')} >
            <Box width={"container.lg"}>
                <Heading fontSize={'2xl'} fontFamily={'body'}
                         fontWeight={500} color={c ? "gray.100" : "black.500"} textAlign='left' pb={2}>
                    Phone number
                </Heading>
                {
                    edit
                        ? <>
                            <Flex justifyContent={"space-between"}>
                                <InputGroup >
                                    <InputLeftElement
                                        pointerEvents='none'
                                        children={<PhoneIcon   color='gray.300'/>}
                                    />
                                    <Input
                                        type='tel'
                                        placeholder='Phone number'
                                        value={phone}
                                        onChange={(e) => setPhone(e.currentTarget.value)}
                                    />
                                </InputGroup>
                            </Flex>
                            <Button
                                onClick={onSaveHandler}
                                variant={"ghost"}
                                my={3}
                            >Save
                            </Button>
                        </>
                        : <Text color={c ? "gray.100" : "black.500"}>
                            Add a number so confirmed users can get your products.
                        </Text>
                }
            </Box>
            <Button
                alignSelf={"top"}
                disabled={c}
                onClick={() => {
                    setA(!a)
                    setD(!d)
                    setB(!b)
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
