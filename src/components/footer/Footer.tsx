import React, {ReactNode} from 'react';
import twitter from "../../assets/twiter23.png";
import instagram from "../../assets/insta23.png";
import facebook from "../../assets/facebook23.png";
import linked from "../../assets/linked23.png";
import telegram from "../../assets/telega23.png";
import donat from "../../assets/heartRed23.png";
import {
    chakra,
    Container,
    Flex,
    Heading,
    Image,
    Stack,
    Text,
    useColorModeValue,
    VisuallyHidden
} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";

const SocialButton = ({
                          children,
                          label,
                          href,
                          w, h
                      }: {
    children: ReactNode;
    label: string;
    href: string;
    w?: number
    h?: number
}) => {
    return (
        <chakra.button
            bg={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
            rounded={'full'}
            w={w || 9}
            h={h || 9}
            target={"_blank"}
            cursor={'pointer'}
            as={'a'}
            href={href}
            display={'inline-flex'}
            alignItems={'center'}
            justifyContent={'center'}
            transition={'background 0.3s ease'}
            _hover={{
                bg: useColorModeValue('blackAlpha.300', 'whiteAlpha.200'),
            }}>
            <VisuallyHidden>{label}</VisuallyHidden>
            {children}
        </chakra.button>
    );
};
const Footer = () => {

    return (
        <Container
            zIndex={1}
            bottom={0}
            position={"fixed"}
            bg={useColorModeValue('gray.50', 'gray.900')}
            borderTopWidth={1}
            borderStyle={'solid'}
            borderColor={useColorModeValue('gray.200', 'gray.700')}
            color={useColorModeValue('gray.700', 'gray.200')}
            as={Stack}
            maxW={'100vw'}
            py={1}
            px={{xl: 20, base: 7}}
            direction={{base: 'column', md: 'row'}}
            justify={{base: 'center', md: 'space-between'}}
            align={{base: 'center', md: 'center'}}>
            <Text fontSize={{md: "16px", base: "10px"}}><Trans>© 2023 Foodshare Club, Limited. All rights
                reserved</Trans></Text>
            {/*<LanguageSelector/>*/}
            <Stack direction={'row'} spacing={6}>
                <SocialButton label={'Twitter'} href={'https://twitter.com/foodshareclub'}>
                    <Image w={6} src={twitter}/>
                </SocialButton>
                <SocialButton label={'facebook'} href={'https://www.facebook.com/foodshareclub'}>
                    <Image w={6} src={facebook}/>

                </SocialButton>
                <SocialButton label={'Instagram'} href={'https://www.instagram.com/foodshareclub/'}>
                    <Image w={6} src={instagram}/>
                </SocialButton>
                <SocialButton label={'linked'} href={'https://www.linkedin.com/company/37215158'}>
                    <Image w={6} src={linked}/>
                </SocialButton>
                <SocialButton label={'telegram'} href={'#'}>
                    <Image w={6} src={telegram}/>
                </SocialButton>

            </Stack>
            <Flex>
                <SocialButton label={'donat'} href={'#'}>
                    <Image w={6} src={donat}/>
                </SocialButton>
                <Heading alignSelf={"center"} size={"md"} color={"red"}>Donation</Heading>
            </Flex>

        </Container>
    );
};

export default Footer;