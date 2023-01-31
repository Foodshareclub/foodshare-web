import React, {useState} from "react";
import {Box, Button, Flex, Heading, Input, InputGroup, InputLeftElement, Text} from "@chakra-ui/react";
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
        <Flex>
            <Box width={"container.lg"}>
                <Heading color={c ? "gray.100" : "gray.500"} textAlign='left'>
                    Phone number
                </Heading>
                {
                    edit
                        ? <>
                            <Flex justifyContent={"space-between"}>
                                <InputGroup>
                                    <InputLeftElement
                                        pointerEvents='none'
                                        children={<PhoneIcon color='gray.300'/>}
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
                                colorScheme={"blackAlpha"}
                                variant={"solid"}
                                mt={3}
                            >Save
                            </Button>
                        </>
                        : <Text color={c ? "gray.100" : "gray.500"}>
                            Add a number so confirmed users can get your products.
                        </Text>
                }
            </Box>
            <Button
                disabled={c}
                onClick={() => {
                    setA(!a)
                    setD(!d)
                    setB(!b)
                    setEdit(!edit)
                }}
                cursor={"pointer"}
            >
                {edit ? 'Cancel' : 'Edit'}
            </Button>
        </Flex>

    );
};
