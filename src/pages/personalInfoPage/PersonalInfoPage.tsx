import {useAppSelector} from "@/hook";
import {emailSelector, phoneNumberSelector, userFirstNameSelector, userSecondNameSelector} from "@/store";
import React, {useEffect, useState} from "react";
import {Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Container, Text} from "@chakra-ui/react";
import {AddressBlock, EmailBlock, NameBlock, PhoneNumberBlock} from "@/components";
import {ChevronRightIcon} from "@chakra-ui/icons";
import {useNavigate} from "react-router-dom";
import {PATH} from "@/utils";

export const PersonalInfoPage = () => {
    const navigate = useNavigate();

    const fName = useAppSelector(userFirstNameSelector);
    const sName = useAppSelector(userSecondNameSelector);
    const userEmail = useAppSelector(emailSelector);
    const phoneNumber = useAppSelector(phoneNumberSelector);

    useEffect(() => {
        setFirstName(fName);
        setSecondName(sName);
        setEmail(userEmail as string);
        if (!phoneNumber) {
            setPhone('');
        } else {
            setPhone(phoneNumber);
        }

    }, [fName, sName, userEmail, phoneNumber]);

    const [firstName, setFirstName] = useState("");
    const [secondName, setSecondName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [a, setA] = useState(false)
    const [b, setB] = useState(false)
    const [c, setC] = useState(false)
    const [d, setD] = useState(false)
    const onSaveHandler = () => {
        console.log(firstName)
        console.log(secondName)
    }
    return (
        <Box mt="23vh">
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
                            setFirstName={setFirstName}
                            secondName={secondName}
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
                            onSaveHandler={onSaveHandler}
                            a={a} b={b} c={c} d={d}
                            setA={setA} setB={setB} setC={setC}
                        />
                    </Box>

            </Container>
        </Box>
    );
};
