import React from 'react';
import {Box, Flex, Heading,Text,Image} from "@chakra-ui/react";
import light from "@/assets/noto-v1_light-bulb.svg";
const TopTips = () => {
    return (
        <Box mt={1} mb={2}  borderRadius={10} bg={"gray.100"}>
        <Box py={2} m={"0 auto"} w={"90%"}>
            <Flex>
                <Image w={5} src={light} alt={"light"}/>
                <Heading fontWeight={500} fontSize={'xl'}>Top tips</Heading>
            </Flex>
            <ul>
                <div>Have safe pick ups during COVID</div>
                <div>Say when you can pick up this listings</div>
                <div> Be polite by saying please and thank you</div>
                <div>Never set off without the pickup confirmed, and an address</div>
            </ul>
            <Text>Read our safe sharing guidelines</Text>
        </Box>
    </Box>
    );
};

export default TopTips;