import React, {useState} from "react";
import {Box, Button, Flex, Input, Text} from "@chakra-ui/react";

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
        <Flex>
            <Box width={"container.lg"}>
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
                                colorScheme={"blackAlpha"}
                                variant={"solid"}
                                mt={3}
                            >Save
                            </Button>
                        </>
                        : <Text color={a ? "gray.100" : "gray.500"}>
                            {firstName} {secondName}
                        </Text>
                }
            </Box>
            <Button
                disabled={a}
                onClick={() => {
                    setB(!b);
                    setC(!c);
                    setD(!d);
                    setEdit(!edit)
                }}
                cursor={"pointer"}
            >
                {edit ? 'Cancel' : 'Edit'}
            </Button>
        </Flex>
    );
};
