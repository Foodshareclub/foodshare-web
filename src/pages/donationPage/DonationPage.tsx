import React from 'react';
import {Box, Button, Container, Flex, Heading, Image, Text} from "@chakra-ui/react";
import foodShare from "@/assets/platform_foodshare.png";
import bracketsUp from "@/assets/bracketsUp.png";
import bracketsDown from "@/assets/bracketsDown.png";

const DonationPage = () => {
    return (
        <Box
            mt={"10vw"}
            mb={"10vw"}
        >
            <Flex
                justify={"center"} h={"60vh"}
                bgColor={"#fede00"}
            >
                <Image
                    cursor={"pointer"}
                    borderRadius={20}
                    _active={{boxShadow: "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px"}}
                    alignSelf={"center"}
                    boxShadow={"rgba(0, 0, 0, 0.4) 0px 30px 90px"}
                    h={"50vh"}
                    fit={"contain"}
                    src={foodShare}/>
            </Flex>
            <Container minW={"container.md"}>
                <Heading size={"2xl"} py={10} color={"#FF2D55"}>
                    Our Donate Page
                </Heading>
                <Heading size={"lg"}>
                    Welcome to our foodsharing company donation page!
                </Heading>
                <Flex py={10} w={"100%"} justify={"space-between"}>
                    <Image w={20} h={20} src={bracketsUp}/>
                    <Box w={"60%"}>
                        <Text fontSize={20} fontWeight={"bold"}>
                            We are a foodsharing startup dedicated to reducing food waste and fighting hunger in our
                            community. Every day, we rescue excess food from local businesses and distribute it to those
                            in need, including families, individuals, and community organizations.
                        </Text>
                        <Heading pt={5} size={"md"} color={"#16B6DF"} textTransform={"uppercase"}>
                            - Tarlan Isaev
                        </Heading>
                    </Box>
                    <Image w={20} h={20} src={bracketsDown}/>
                </Flex>
                <Text fontSize={20}>
                    Your donation can make a significant impact on our ability to provide nutritious food to those who
                    need it most. With your support, we can continue to expand our reach and ensure that no one in our
                    community goes hungry.
                </Text>
                <br/>
                <Text fontSize={20}>
                    Whether you choose to make a one-time donation or become a recurring donor, your contribution is
                    greatly appreciated. Every dollar counts and will go directly towards supporting our food rescue and
                    distribution efforts.
                </Text>
                <br/>
                <Text fontSize={20}>
                    We believe that everyone deserves access to healthy and nourishing food, and we are committed to
                    making that a reality in our community. By donating to our foodsharing company, you are helping us
                    to achieve that mission and create a brighter future for all.
                    Thank you for considering a donation to our foodsharing company. Together, we can make a difference
                    in the lives of those who struggle with food insecurity.
                </Text>
                <Button variant={"outline"} colorScheme={"blue"} color={"#16B6DF"} borderColor={"#16B6DF"} mt={5}>Learn
                    more</Button>
            </Container>
        </Box>
    );
};

export default DonationPage;