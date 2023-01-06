import React from 'react';
import {Box, Button, Flex, Heading, Text, Image} from "@chakra-ui/react";
import man from "../../assets/manAndCnife.png";
import AsideProducts from "../productPage/asideProducts/AsideProducts";
import {asideProdProperty} from "../../utils/mockArray";
import {useNavigate} from "react-router-dom";

const VolunteerPage = () => {
    const navigate = useNavigate()
    return (
        <Box w="90%" m="0 auto">
            <Flex justify="space-between">
                <Box alignSelf="center" lineHeight={10} alignItems="start">
                    <Heading>Volunteer with Foodshare!</Heading>
                    <Text fontSize="24px">Find volunteer oppportunies and help out your local community!</Text>
                    <Button mt={6} fontSize="22px"
                            w="50%" color="#ffffff"
                            background={"#ff2d55"}
                            _hover={{bg: '#c92040'}}
                            onClick={() => navigate("/volunteer/opportunities")}
                    >Get Started</Button>
                </Box>
                <Box>
                    <Image src={man} alt={man}/>
                </Box>
            </Flex>
            <Heading mt={10} mb={4}>Foodshare Locations Near You</Heading>
            <Flex justify="space-around">
                <Box w="40%">
                    {asideProdProperty.map((item, id) => (
                        <AsideProducts
                            height="25%"
                            key={id} img={item.img}
                            name={item.name} distance={item.distance}
                            about={item.about}
                            available={item.available}/>
                    ))}
                </Box>
                <Box w="40%">
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