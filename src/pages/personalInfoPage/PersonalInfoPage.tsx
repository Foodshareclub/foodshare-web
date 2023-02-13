import React, {useEffect, useState} from "react";
import {Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Container, Text} from "@chakra-ui/react";
import {AddressBlock, EmailBlock, NameBlock, PhoneNumberBlock} from "@/components";
import {ChevronRightIcon} from "@chakra-ui/icons";
import {useNavigate} from "react-router-dom";
import {PATH} from "@/utils";
import {useActionCreators, useAppSelector} from "@/hook";
import {AllValuesType} from "@/api/profileAPI";
import {updateProfileTC, uploadImgToDBTC, userActions} from "@/store/slices/userReducer";

export const PersonalInfoPage = () => {
    const navigate = useNavigate();
    const value = useAppSelector<AllValuesType>(state => state.user.value);
    const {user} = useAppSelector(state => state.user.session);
    const actions = useActionCreators({...userActions, updateProfileTC, uploadImgToDBTC});


    const [address, setAddress] = useState<string>("");
    const [firstName, setFirstName] = useState("");
    const [secondName, setSecondName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [about, setAbout] = useState<string>("");
    const [avatarUrl, setAvatarUrl] = useState<string>('');


    useEffect(() => {
        setFirstName(value.first_name);
        setAddress(value.user_address);
        setSecondName(value.second_name);
        setEmail(user.email as string);
        setAbout(value.about_me)
        setAvatarUrl(value.avatar_url)
        if (!value.phone_number) {
            setPhone('');
        } else {
            setPhone(value.phone_number);
        }
    }, [value]);

    let defaultValues = {
        liked_post: value.liked_post,
        about_me: about,
        avatar_url: avatarUrl,
        birth_date: value.birth_date,
        first_name: firstName,
        phone_number: phone,
        second_name: secondName,
        updated_at: new Date(),
        user_address: address,
        user_location: value.user_location,
        user_metro_station: value.user_metro_station,
        username: value.username,
        created_time: user.created_at || value.created_time,
        email: user.email,
        id: value.id,
    }
    const onSaveHandler = async () => {
        await actions.updateProfileTC(defaultValues);
    };

    const [a, setA] = useState(false)
    const [b, setB] = useState(false)
    const [c, setC] = useState(false)
    const [d, setD] = useState(false)

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
                        firstName={firstName}
                        secondName={secondName}
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
                        phone={phone}
                        setPhone={setPhone}
                        onSaveHandler={onSaveHandler}
                        setA={setA} setB={setB} setD={setD}
                    />
                </Box>


                <Box mt={5}>
                    <AddressBlock
                        a={a} b={b} c={c} d={d}
                        setA={setA} setB={setB} setC={setC}
                    />
                </Box>

            </Container>
        </Box>
    );
};
