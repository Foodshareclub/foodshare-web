import React, {useState} from "react";
import {Box, Button, Flex, Input, Text} from "@chakra-ui/react";

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
        <Flex>
            <Box width={"container.lg"}>
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
                                colorScheme={"blackAlpha"}
                                variant={"solid"}
                                mt={3}
                            >Save
                            </Button>
                        </>
                        : <Text color={b ? "gray.100" : "gray.500"}>
                            {email}
                        </Text>
                }
            </Box>
            <Button
                disabled={b}
                onClick={() => {
                    setA(!a)
                    setD(!d)
                    setC(!c)
                    setEdit(!edit)
                }}
                cursor={"pointer"}
            >
                {edit ? 'Cancel' : 'Edit'}
            </Button>
        </Flex>

    );
};
