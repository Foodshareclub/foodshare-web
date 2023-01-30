import React, {useEffect, useState} from 'react';
import {
    Accordion, AccordionButton, AccordionIcon,
    AccordionItem, AccordionPanel,
    Avatar,
    Box,
    Button,
    Container,
    Flex,
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
        <Box mt="23vh">
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
        }else {
            setPhone(phoneNumber);
        }

    }, [fName, sName, userEmail, phoneNumber]);

    const [firstName, setFirstName] = useState("");
    const [secondName, setSecondName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const onSaveHandler = () => {
        console.log(firstName)
        console.log(secondName)
    }
    return (
        <Container maxW={"container.md"}>
            <Box mt="23vh" mb={5}>
                Personal Info
            </Box>


            <Accordion
                // allowMultiple
                allowToggle
            >
                <AccordionItem>
                    <h2>
                        <AccordionButton>
                            <Box as="span" flex='1' textAlign='left'>
                                Legal name
                            </Box>
                            <AccordionIcon />
                        </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                        <LegalNameBlock
                            firstName={firstName}
                            setFirstName={setFirstName}
                            secondName={secondName}
                            setSecondName={setSecondName}
                            onSaveHandler={onSaveHandler}
                        />
                    </AccordionPanel>
                </AccordionItem>

                <AccordionItem>
                    <h2>
                        <AccordionButton>
                            <Box as="span" flex='1' textAlign='left'>
                                Email address
                            </Box>
                            <AccordionIcon />
                        </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                        <EmailBlock
                            email={email}
                            onSaveHandler={onSaveHandler}
                            setEmail={setEmail}
                        />
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem>
                    <h2>
                        <AccordionButton>
                            <Box as="span" flex='1' textAlign='left'>
                                Phone number
                            </Box>
                            <AccordionIcon />
                        </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                        <PhoneNumberBlock
                            phoneNumber={phone}
                            setPhone={setPhone}
                            onSaveHandler={onSaveHandler}
                        />
                    </AccordionPanel>
                </AccordionItem
                ><AccordionItem>
                    <h2>
                        <AccordionButton>
                            <Box as="span" flex='1' textAlign='left'>
                                Address
                            </Box>
                            <AccordionIcon />
                        </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                        <AddressBlock
                            onSaveHandler={onSaveHandler}
                        />
                    </AccordionPanel>
                </AccordionItem>
            </Accordion>









        </Container>

    );
};

type LegalNameBlockType = {
    firstName: string
    setFirstName: (firstName: string) => void
    secondName: string
    setSecondName: (secondName: string) => void
    onSaveHandler: () => void
}

export const LegalNameBlock: React.FC<LegalNameBlockType> = ({
                                                                 firstName,
                                                                 setFirstName,
                                                                 secondName,
                                                                 setSecondName,
                                                                 onSaveHandler
                                                             }) => {
    const [edit, setEdit] = useState(true);

    return (
        <Flex>
            <Box width={"container.lg"}>
                {/*<Text mb={3} as={'b'}>*/}
                {/*    Legal name*/}
                {/*</Text>*/}

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
                        : <Text>
                            {firstName} {secondName}
                        </Text>
                }
            </Box>

            <Text
                onClick={() => setEdit(!edit)}
                cursor={"pointer"}
            >
                {edit ? 'Cancel' : 'Edit'}
            </Text>


        </Flex>

    );
};

type EmailBlockType = {
    email: string
    setEmail: (newEmail: string) => void
    onSaveHandler: () => void
}

export const EmailBlock: React.FC<EmailBlockType> = ({email, onSaveHandler, setEmail}) => {
    const [edit, setEdit] = useState(true);

    return (
        <Flex>
            <Box width={"container.lg"}>
                {/*<Text mb={3} as={'b'}>*/}
                {/*    Email address*/}
                {/*</Text>*/}

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
                        : <Text>
                            {email}
                        </Text>
                }
            </Box>

            <Text
                onClick={() => setEdit(!edit)}
                cursor={"pointer"}
            >
                {edit ? 'Cancel' : 'Edit'}
            </Text>
        </Flex>

    );
};


type PhoneNumberBlockType = {
    phoneNumber: string
    setPhone: (newNumber: string) => void
    onSaveHandler: () => void
}

export const PhoneNumberBlock: React.FC<PhoneNumberBlockType> = ({phoneNumber, onSaveHandler, setPhone}) => {
    const [edit, setEdit] = useState(true);

    return (
        <Flex>
            <Box width={"container.lg"}>
                {/*<Text mb={3} as={'b'}>*/}
                {/*    Phone number*/}
                {/*</Text>*/}

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
                                        value={phoneNumber}
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
                        : <Text>
                            Add a number so confirmed users can get your products.
                        </Text>
                }
            </Box>

            <Text
                onClick={() => setEdit(!edit)}
                cursor={"pointer"}
            >
                {edit ? 'Cancel' : 'Edit'}
            </Text>
        </Flex>

    );
};


type AddressBlockType = {
    onSaveHandler: () => void
}

export const AddressBlock: React.FC<AddressBlockType> = ({onSaveHandler}) => {
    const [edit, setEdit] = useState(true);

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
                {/*<Text mb={3} as={'b'}>*/}
                {/*    Address*/}
                {/*</Text>*/}

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
                        : <Text>
                            Use a permanent address where you can receive mail.
                        </Text>
                }
            </Box>

            <Text
                onClick={() => setEdit(!edit)}
                cursor={"pointer"}
            >
                {edit ? 'Cancel' : 'Edit'}
            </Text>
        </Flex>

    );

}