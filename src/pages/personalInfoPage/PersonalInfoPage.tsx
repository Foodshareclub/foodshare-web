import React, {useEffect, useState} from "react";
import {Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Container, Skeleton, Text} from "@chakra-ui/react";
import {AddressBlock, EmailBlock, NameBlock, PhoneNumberBlock} from "@/components";
import {ChevronRightIcon} from "@chakra-ui/icons";
import {useNavigate} from "react-router-dom";
import {PATH} from "@/utils";
import {useActionCreators, useAppSelector} from "@/hook";
import {AllValuesType} from "@/api/profileAPI";
import {
    getAddressProfileTC,
    getAllCountriesTC,
    updateProfileTC,
    uploadImgToDBTC,
    userActions
} from "@/store/slices/userReducer";
import {userAddressSelector} from "@/store/slices/userSelectors";

export const PersonalInfoPage = () => {
    const navigate = useNavigate();
    const address = useAppSelector(userAddressSelector);
    const value = useAppSelector<AllValuesType>(state => state.user.value);
    const {user} = useAppSelector(state => state.user.session);
    const actions = useActionCreators({...userActions, updateProfileTC,getAllCountriesTC,getAddressProfileTC, uploadImgToDBTC});
    const [firstName, setFirstName] = useState(value.first_name);
    const [secondName, setSecondName] = useState(value.second_name);
    const [email, setEmail] = useState(user.email as string);
    const [phone, setPhone] = useState(value.phone_number);

    useEffect(() => {
            actions.getAddressProfileTC(user.id)
            actions.getAllCountriesTC()
        return ()=>{
            console.log("dead personalInfoPage")
        }
    }, [])

    let defaultValues = {...value,
        first_name: firstName,
        phone_number: phone,
        second_name: secondName,
        updated_at: new Date(),
        created_time: user.created_at || value.created_time,
        email: user.email,
    }
    const onSaveHandler = async () => {
        await actions.updateProfileTC(defaultValues);
    };
    const [a, setA] = useState(false)
    const [b, setB] = useState(false)
    const [c, setC] = useState(false)
    const [d, setD] = useState(false)

// if(!Object.keys(address).length) return (
//     <Skeleton mt={"24vh"} height='40px' isLoaded={false}/>
// )
    return (
        <Box mt="23vh" mb={"12vh"}>
            <Container maxW={"container.md"}>
                <Breadcrumb spacing='8px' separator={<ChevronRightIcon color='gray.800'/>}>
                    <BreadcrumbItem
                        fontWeight='medium'
                        onClick={() => navigate(PATH.settingsPage)}
                    >
                        <BreadcrumbLink>Account settings</BreadcrumbLink>
                    </BreadcrumbItem>

                    <BreadcrumbItem isCurrentPage fontWeight='medium'>
                        <span>Personal info</span>
                    </BreadcrumbItem>
                </Breadcrumb>

                <Box mt={'8vh'}>
                    <Text fontSize='4xl' fontWeight={"bold"}>
                        Personal info
                    </Text>
                    <NameBlock
                        firstName={firstName || value.first_name}
                        secondName={secondName || value.second_name}
                        setFirstName={setFirstName}
                        setSecondName={setSecondName}
                        onSaveHandler={onSaveHandler}
                        a={a} b={b} c={c} d={d}
                        setB={setB} setC={setC} setD={setD}
                    />
                </Box>


                <Box mt={5}>
                    <EmailBlock
                        setC={setC} setD={setD}
                        a={a} b={b} c={c} d={d}
                        email={email}
                        onSaveHandler={onSaveHandler}
                        setEmail={setEmail}
                        setA={setA}
                    />
                </Box>


                <Box mt={5}>
                        <PhoneNumberBlock
                            a={a} b={b} c={c} d={d}
                            phone={phone || value.phone_number}
                            setPhone={setPhone}
                            onSaveHandler={onSaveHandler}
                            setA={setA} setB={setB} setD={setD}
                        />
                </Box>


                <Box mt={5}>
                    <AddressBlock
                        address={address}
                        a={a} b={b} c={c} d={d}
                        setA={setA} setB={setB} setC={setC}
                    />
                </Box>

            </Container>
        </Box>
    );
};
