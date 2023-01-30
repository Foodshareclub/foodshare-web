import React, {useEffect, useState} from 'react';
import {
    Avatar,
    Box,
    Button,
    Container,
    Flex,
    Heading,
    Input,
    InputGroup,
    InputLeftElement,
    SimpleGrid,
    Text
} from "@chakra-ui/react";
import {ListingPersonCard} from "@/components";
import {useAppSelector, useGridSize} from "@/hook";
import {
    emailSelector,
    imgURLSelector,
    phoneNumberSelector,
    userFirstNameSelector,
    userSecondNameSelector
} from "@/store";
import {settingsInfoArray} from "@/utils";
import {useNavigate} from "react-router-dom";
import {PhoneIcon} from "@chakra-ui/icons";

export const SettingsPage = () => {
    const gridSize = useGridSize();

    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);
    const imgUrl = useAppSelector(imgURLSelector);

    return (
        <Box mt="20vh">
            <Box>
                <ListingPersonCard
                    userFirstName={userFirstName}
                    userSecondName={userSecondName}
                    imgUrl={imgUrl}
                />
            </Box>
            <SimpleGrid p={8}
                        columns={gridSize}
                        spacing={10}
            >
                {settingsInfoArray.map((card, i) => {
                    return <SettingsCard
                        settingTitle={card.settingTitle}
                        description={card.description}
                        imgSRC={card.img}
                        route={card.route}
                        key={i}
                    />
                })}
            </SimpleGrid>
        </Box>
    );
};

type SettingsCardType = {
    imgSRC: string
    settingTitle: string
    description: string
    route: string
}

export const SettingsCard: React.FC<SettingsCardType> = ({
                                                             imgSRC,
                                                             settingTitle,
                                                             description,
                                                             route
                                                         }) => {
    const navigate = useNavigate();

    const onNavigateHandler = () => navigate(route);

    return (
        <Flex>
            <Box
                ml='3'
                boxShadow={'0px 5px 10px 2px rgba(34, 60, 80, 0.2)'}
                p={4}
                w={'100%'}
                cursor={"pointer"}
                onClick={onNavigateHandler}
            >
                <Avatar src={imgSRC} mb={2}/>

                <Text fontWeight='bold' mb={2}>
                    {settingTitle}
                </Text>

                <Text fontSize='sm' mb={2}>
                    {description}
                </Text>
            </Box>
        </Flex>
    );
};


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
            <LegalNameBlock
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

type LegalNameBlockType = {
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

export const LegalNameBlock: React.FC<LegalNameBlockType> = ({
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
        <Flex>
            <Box width={"container.lg"}>
                {
                    edit
                        ? <>
                            <Input
                                placeholder={'Country/region'}
                                value={uCountry}
                                onChange={(e) => setCountry(e.currentTarget.value)}
                            />
                            <Input
                                placeholder={'Street address'}
                                value={uStreet}
                                onChange={(e) => setStreet(e.currentTarget.value)}
                            />
                            <Input
                                placeholder={'Flat, suit'}
                                value={uFlat}
                                onChange={(e) => setFlat(e.currentTarget.value)}
                            />
                            <Flex justifyContent={"space-between"}>
                                <Input
                                    placeholder={'City'}
                                    value={uCity}
                                    onChange={(e) => setCity(e.currentTarget.value)}
                                />
                                <Input
                                    placeholder={'State/ Province/ Country/ Region'}
                                    value={uRegion}
                                    onChange={(e) => setRegion(e.currentTarget.value)}
                                />
                            </Flex>
                            <Input
                                placeholder={'Postcode'}
                                value={uPostcode}
                                onChange={(e) => setPostcode(e.currentTarget.value)}
                            />
                            <Button
                                onClick={onSaveHandler}
                                colorScheme={"blackAlpha"}
                                variant={"solid"}
                                mt={3}
                            >Save
                            </Button>
                        </>
                        : <Text color={d ? "gray.100" : "gray.500"}>
                            Use a permanent address where you can receive mail.
                        </Text>
                }
            </Box>
            <Button
                disabled={d}
                onClick={() => {
                    setA(!a)
                    setB(!b)
                    setC(!c)
                    setEdit(!edit)
                }}
                cursor={"pointer"}
            >
                {edit ? 'Cancel' : 'Edit'}
            </Button>
        </Flex>

    );

}