import React, {useEffect, useState} from "react";
import {Box, Button, Flex, FormControl, FormLabel, Heading, Input, Select, Text} from "@chakra-ui/react";
import {profileAPI} from "@/api";
import {userIdFromSessionSelector} from "@/store";
import {useActionCreators, useAppSelector} from "@/hook";
import {Trans} from "@lingui/macro";
import {getAddressProfileTC} from "@/store/slices/userReducer";
import {userAddressSelector, userCountrySelector} from "@/store/slices/userSelectors";
import {supabase} from "@/supaBase.config";
import {AddressType} from "@/api/profileAPI";

type AddressBlockType = {
    a: boolean
    b: boolean
    c: boolean
    d: boolean
    setA: (value: boolean) => void
    setB: (value: boolean) => void
    setC: (value: boolean) => void
}

export const AddressBlock: React.FC<AddressBlockType> = ({a, b, c, d, setC, setA, setB}) => {
    const userId = useAppSelector(userIdFromSessionSelector);
    const address = useAppSelector(userAddressSelector);
    const actions = useActionCreators({getAddressProfileTC})
    const userCountry = useAppSelector((state) => userCountrySelector(state, address.country));
    useEffect(() => {
        actions.getAddressProfileTC(userId).unwrap().then((res: AddressType) => {
            profileAPI.getCountriesIndex(res.country).then(res => {
                    console.log(res.data && res.data[0].name)
                }
            )
        })
    }, [])

    // useEffect(() => {
    //     (async () => {
    //         const {data, error} = await supabase
    //             .from('profiles')
    //             .select(`
    //                     "*",
    //                     address!address_profile_id_fkey ("*")
    //                   `)
    //             .eq('id', userId);
    //         console.log(data)
    //     })()
    // }, [])

    const [edit, setEdit] = useState(false);
    const [lineOne, setLineOne] = useState(address.address_line_1);
    const [lineTwo, setLineTwo] = useState(address.address_line_2);
    const [province, setProvince] = useState(address.state_province);
    const [country, setCountry] = useState(address.country);
    const [postalCode, setPostalCode] = useState(address.postal_code);
    const [city, setCity] = useState(address.city)
    const [county, setCounty] = useState(address.county)

    const addressObject = {
        ...address,
        address_line_1: lineOne,
        county: address.county,
        city: city,
        state_province: province,
        postal_code: postalCode,
        profile_id: userId
    };
    const onSaveHandler = async () => {
        await profileAPI.updateAddress(addressObject)
    }
    return (
        <Flex borderBottomWidth={1}
              borderStyle={'solid'}
              borderColor={edit ? "white" : 'gray.200'}>
            <Box width={"container.lg"}>
                <Heading fontSize={'2xl'} fontFamily={'body'}
                         fontWeight={500} pb={2} color={d ? "gray.100" : "black.500"} textAlign='left'>
                    Address
                </Heading>
                {
                    edit
                        ? <>
                            <FormControl>
                                <FormLabel pt={2}><Trans>Address Line 1 *</Trans></FormLabel>
                                <Input
                                    placeholder={'Address Line 1'}
                                    value={lineOne}
                                    onChange={(e) => setLineOne(e.currentTarget.value)}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel pt={2}><Trans>Address Line 2</Trans></FormLabel>
                                <Input
                                    placeholder={'Address Line 2'}
                                    value={lineTwo}
                                    onChange={(e) => setLineTwo(e.currentTarget.value)}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel pt={2}><Trans>City *</Trans></FormLabel>
                                <Input
                                    placeholder={'City'}
                                    value={city}
                                    onChange={(e) => setCity(e.currentTarget.value)}
                                />
                            </FormControl>
                            <Flex justifyContent={"space-between"}>
                                <FormControl w={"45%"}>
                                    <FormLabel pt={2}><Trans>State/Province *</Trans></FormLabel>
                                    <Input
                                        placeholder={'State/Province'}
                                        value={province}
                                        onChange={(e) => setProvince(e.currentTarget.value)}
                                    />
                                </FormControl>
                                <FormControl w={"45%"}>
                                    <FormLabel pt={2}><Trans>County *</Trans></FormLabel>
                                    <Input
                                        placeholder={'County'}
                                        value={county}
                                        onChange={(e) => setCounty(e.currentTarget.value)}
                                    />
                                </FormControl>
                            </Flex>
                            <Flex justifyContent={"space-between"}>
                                <FormControl w={"45%"}>
                                    <FormLabel pt={2}><Trans>Zip/Postal Code *</Trans></FormLabel>
                                    <Input
                                        placeholder={'Zip/Postal Code'}
                                        value={postalCode}
                                        onChange={(e) => setPostalCode(e.currentTarget.value)}
                                    />
                                </FormControl>
                                <FormControl w={"45%"}>
                                    <FormLabel pt={2}><Trans>Country</Trans></FormLabel>
                                    <Select>
                                        <option value="1">dfdfdfd</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                    </Select>
                                </FormControl>
                            </Flex>

                            <Button
                                onClick={() => {
                                    onSaveHandler()
                                    setA(!a)
                                    setB(!b)
                                    setC(!c)
                                    setEdit(!edit)
                                }}
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