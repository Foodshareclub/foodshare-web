import {useAppSelector} from "@/hook";
import {emailSelector, phoneNumberSelector, userFirstNameSelector, userSecondNameSelector} from "@/store";
import React, {useEffect, useState} from "react";
import {Container, Heading} from "@chakra-ui/react";
import {AddressBlock, EmailBlock, NameBlock, PhoneNumberBlock} from "@/components";

export const PersonalInfoPage = () => {
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
        <Container maxW={"container.md"}>
            <Heading color={a ? "gray.100" : "gray.500"} mt="23vh" mb={5}>
                Personal Info
            </Heading>
            <NameBlock
                firstName={firstName}
                setFirstName={setFirstName}
                secondName={secondName}
                setSecondName={setSecondName}
                onSaveHandler={onSaveHandler}
                a={a} b={b} c={c} d={d}
                setB={setB} setC={setC} setD={setD}
            />
            <Heading color={b ? "gray.100" : "gray.500"} textAlign='left'>
                Email address
            </Heading>

            <EmailBlock
                setC={setC} setD={setD}
                a={a} b={b} c={c} d={d}
                email={email}
                onSaveHandler={onSaveHandler}
                setEmail={setEmail}
                setA={setA}/>

            <Heading color={c ? "gray.100" : "gray.500"} textAlign='left'>
                Phone number
            </Heading>

            <PhoneNumberBlock
                a={a} b={b} c={c} d={d}
                phone={phone}
                setPhone={setPhone}
                onSaveHandler={onSaveHandler}
                setA={setA} setB={setB} setD={setD}/>

            <Heading color={d ? "gray.100" : "gray.500"} textAlign='left'>
                Address
            </Heading>
            <AddressBlock
                onSaveHandler={onSaveHandler}
                a={a} b={b} c={c} d={d} setA={setA} setB={setB} setC={setC}/>
        </Container>

    );
};
