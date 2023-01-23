import React, {ReactNode} from 'react';
import twitter from "../../assets/twiter.svg";
import insta from "../../assets/instagram.svg";
import facebook from "../../assets/facebook.svg";
import {Avatar, Box, chakra, Container, Stack, Text, useColorModeValue, VisuallyHidden} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import LanguageSelector from "../languageSelector/LanguageSelector";

const SocialButton = ({
                          children,
                          label,
                          href,
                      }: {
    children: ReactNode;
    label: string;
    href: string;
}) => {
    return (
        <chakra.button
            bg={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
            rounded={'full'}
            w={12}
            h={12}
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
        <Box
            bg={useColorModeValue('gray.50', 'gray.900')}
            color={useColorModeValue('gray.700', 'gray.200')}>
            <Box
                borderTopWidth={1}
                borderStyle={'solid'}
                borderColor={useColorModeValue('gray.200', 'gray.700')}>
                <Container
                    as={Stack}
                    maxW={'6xl'}
                    py={4}
                    direction={{base: 'column', md: 'row'}}
                    justify={{base: 'center', md: 'space-between'}}
                    align={{base: 'center', md: 'center'}}>
                    <Text><Trans>© 2022 Foodshare Club, Limited. All rights reserved</Trans></Text>
                    <LanguageSelector/>
                    <Stack direction={'row'} spacing={6}>
                        <SocialButton label={'Twitter'} href={'#'}>
                            <Avatar size='xs' src={twitter}/>
                        </SocialButton>
                        <SocialButton label={'facebook'} href={'#'}>
                            <Avatar size='xs' src={facebook}/>

                        </SocialButton>
                        <SocialButton label={'Instagram'} href={'#'}>
                            <Avatar size='xs' src={insta}/>
                        </SocialButton>
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
};

export default Footer;