import React from 'react';
import {Box, Flex, Heading,Text,Image} from "@chakra-ui/react";
import light from "@/assets/noto-v1_light-bulb.svg";
const TopTips = () => {
    return (
        <Box  mb={5}  borderRadius={10} bg={"gray.100"}>
        <Box py={2} m={"0 auto"} w={"70%"}>
            <Flex>
                <Image w={5} src={light} alt={"light"}/>
                <Heading fontWeight={500} fontSize={'xl'}>Top tips</Heading>
            </Flex>
            <ul>
                <li>Have safe pick ups during COVID</li>
                <li>Say when you can pick up this listings</li>
                <li> Be polite by saying please and thank you</li>
                <li>Never set off without the pickup confirmed, and an address</li>
            </ul>
            <Text>Read our safe sharing guidelines</Text>
        </Box>
    </Box>
    );
};

export default TopTips;