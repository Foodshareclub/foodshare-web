import React, {useState} from "react";
import {Box, Button, Flex, Heading, Input, Text, useColorModeValue} from "@chakra-ui/react";

type AddressBlockType = {
    onSaveHandler: () => void
    a: boolean
    b: boolean
    c: boolean
    d: boolean
    setA: (value: boolean) => void
    setB: (value: boolean) => void
    setC: (value: boolean) => void
}

export const AddressBlock: React.FC<AddressBlockType> = ({onSaveHandler, a, b, c, d, setC, setA, setB}) => {
    const [edit, setEdit] = useState(false);

    const [uCountry, setCountry] = useState('');
    const [uStreet, setStreet] = useState('');
    const [uFlat, setFlat] = useState('');
    const [uCity, setCity] = useState('');
    const [uRegion, setRegion] = useState('');
    const [uPostcode, setPostcode] = useState('');

    const addressObject = {
        country: uCountry,
        street: uStreet,
        flat: uFlat,
        city: uCity,
        region: uRegion,
        postcode: uPostcode
    };


    return (
        <Flex  borderBottomWidth={1}
               borderStyle={'solid'}
               borderColor={useColorModeValue('gray.200', 'gray.700')} >
            <Box width={"container.lg"}>
                <Heading fontSize={'2xl'} fontFamily={'body'}
                         fontWeight={500} pb={2} color={d ? "gray.100" : "black.500"} textAlign='left'>
                    Address
                </Heading>
                {
                    edit
                        ? <>
                            <Input mb={2}
                                placeholder={'Country/region'}
                                value={uCountry}
                                onChange={(e) => setCountry(e.currentTarget.value)}
                            />
                            <Input mb={2}
                                placeholder={'Street address'}
                                value={uStreet}
                                onChange={(e) => setStreet(e.currentTarget.value)}
                            />
                            <Input mb={2}
                                placeholder={'Flat, suit'}
                                value={uFlat}
                                onChange={(e) => setFlat(e.currentTarget.value)}
                            />
                            <Flex justifyContent={"space-between"}>
                                <Input w={"45%"} mb={2}
                                    placeholder={'City'}
                                    value={uCity}
                                    onChange={(e) => setCity(e.currentTarget.value)}
                                />
                                <Input w={"45%"} mb={2}
                                    placeholder={'State/ Province/ Country/ Region'}
                                    value={uRegion}
                                    onChange={(e) => setRegion(e.currentTarget.value)}
                                />
                            </Flex>
                            <Input mb={2}
                                placeholder={'Postcode'}
                                value={uPostcode}
                                onChange={(e) => setPostcode(e.currentTarget.value)}
                            />
                            <Button
                                onClick={onSaveHandler}
                                variant={"ghost"}
                                my={3}
                            >Save
                            </Button>
                        </>
                        : <Text color={d ? "gray.100" : "black.500"}>
                            Use a permanent address where you can receive mail.
                        </Text>
                }
            </Box>
            <Button
                alignSelf={"top"}
                disabled={d}
                onClick={() => {
                    setA(!a)
                    setB(!b)
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

}