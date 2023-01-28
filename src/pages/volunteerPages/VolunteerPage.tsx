import React from 'react';
import {Box, Button, Flex, Heading, Image, Text} from "@chakra-ui/react";
import man from "../../assets/manAndCnife.png";
import {useNavigate} from "react-router-dom";
import {Trans} from "@lingui/macro";
import {asideProdProperty} from "@/utils/mockArray";
import {AsideProducts} from "@/components";

const VolunteerPage = () => {
    const navigate = useNavigate();

    return (
        <Box p={7} mt={["55%","45%","35%", "30%", "25%", "20%"]} w="100%" mx="auto">
            <Flex direction={{md: "row", base: "column"}} justify="space-between">
                <Box alignSelf="center" lineHeight={10}>
                    <Heading pt={{base:"15%","ss":"0"}} textAlign={{md: "start", base: "center"}}>
                        <Trans>Volunteer with Foodshare!</Trans>
                    </Heading>
                    <Text fontSize="24px">
                        <Trans>Find volunteer oppportunies and help out your local community!</Trans>
                    </Text>
                    <Button alignItems={"center"} mt={6} fontSize="22px"
                            w={{md: "50%", base: "100%"}} color="#ffffff"
                            background={"#ff2d55"}
                            _hover={{bg: '#c92040'}}
                            onClick={() => navigate("/volunteer/opportunities")}
                    ><Trans>Get Started</Trans></Button>
                </Box>
                <Box>
                    <Image
                         m={{md:"0",base:"10% auto 0 auto"}}
                           src={man} alt='man'/>
                </Box>
            </Flex>
            <Heading textAlign={{md: "start", base: "center"}} mt={10} mb={4}><Trans> Locations Near You</Trans></Heading>
            <Flex direction={{mm: "row", base: "column"}} justify="space-around">
                <Box w={{md: "40%", base: "100%"}}>
                    {asideProdProperty.map((item, id) => (
                        <AsideProducts
                            height="25%"
                            key={id} img={item.img}
                            name={item.name} distance={item.distance}
                            about={item.about}
                            available={item.available}/>
                    ))}
                </Box>
                <Box w={{md: "40%", base: "100%"}}>
                    {asideProdProperty.map((item, id) => (
                        <AsideProducts
                            height="25%"
                            key={id} img={item.img}
                            name={item.name} distance={item.distance}
                            about={item.about}
                            available={item.available}/>
                    ))}
                </Box>
            </Flex>


        </Box>
    );
};

export default VolunteerPage;