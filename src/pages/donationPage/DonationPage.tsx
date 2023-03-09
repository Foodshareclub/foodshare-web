import React from 'react';
import {Box, Flex, Image, Container, Heading} from "@chakra-ui/react";
import foodshare from "@/assets/platform_foodshare.png";
const DonationPage = () => {
    return (
        <Box
            mt={"10vw"}
        >
        <Flex

            justify={"center"}  h={"60vh"}
              bgColor={"#fede00"}
             >
            <Image
                borderRadius={20}
                _active={{boxShadow: "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px"}}
                alignSelf={"center"}
                boxShadow={"rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset;"}
                h={"50vh"}
                //w={"100vw"}
                fit={"contain"} src={foodshare}/>

        </Flex >
            <Container></Container>
        </Box>
    );
};

export default DonationPage;