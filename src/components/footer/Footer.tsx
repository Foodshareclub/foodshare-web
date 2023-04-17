import React, {ReactNode} from 'react';
import twitter from "../../assets/twiter23.png";
import instagram from "../../assets/insta23.png";
import facebook from "../../assets/facebook23.png";
import linked from "../../assets/linked23.png";
import telegram from "../../assets/telega23.png";
import donat from "../../assets/heartRed23.png";
import feedback from "../../assets/feedbackIcon.svg";
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
import {PATH} from "@/utils";

const SocialButton = ({children, label, href, w, h, target}: {
    children: ReactNode;
    label: string;
    href: string;
    w?: number
    h?: number
    target?: string
}) => {
    return (
        <chakra.button
            //bg={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
            rounded={'full'}
            w={w || 9}
            h={h || 9}
            target={target || "_blank"}
            cursor={'pointer'}
            as={'a'}
            href={href}
            display={'inline-flex'}
            alignItems={'center'}
            justifyContent={'center'}
            //transition={'background 0.3s ease'}
            // _hover={{
            //     bg: useColorModeValue('blackAlpha.300', 'whiteAlpha.200'),
            // }}
        >
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
            bg={"white"}
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
            <Stack direction={{base: 'column', 'mm': 'row'}} spacing={2}>
                <Flex justify={"center"}>
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
                    <SocialButton label={'telegram'} href={'https://t.me/foodshare_club'}>
                        <Image w={6} src={telegram}/>
                    </SocialButton>
                </Flex>

                <Flex justify={"center"} pl={{base: 'auto', 'mm': 10}}>
                    <SocialButton  label={'feedback'} href={'https://eu-submit.jotform.com/231016600816041'}>
                        <Image w={6} src={feedback}/>
                    </SocialButton>
                    <Heading pr={2} alignSelf={"center"} size={"ыь"}>Feedback</Heading>
                    <SocialButton target={"_parent"} label={'donat'} href={PATH.donationPage}>
                        <Image w={6} src={donat}/>
                    </SocialButton>
                    <Heading alignSelf={"center"} size={"sm"} color={"red"}>Donation</Heading>
                </Flex>
            </Stack>
        </Container>
    );
};
export default Footer;