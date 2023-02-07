import * as React from "react";
import {Avatar, Box, Flex, Heading, Text} from "@chakra-ui/react";

type MinifiedUserInfoType = {
    src: string
    firstName?: string
    secondName?: string
    description?: string
}

export const MinifiedUserInfo: React.FC<MinifiedUserInfoType> = ({src, firstName, secondName, description}) => {
    return (
        <Flex cursor={"pointer"} borderRadius={"5%"} _hover={{bg: "white"}} py={2} flex='1' gap='4' px={2}
              alignItems='center' flexWrap='wrap'>
            <Avatar
                name={firstName}
                src={src}/>
            <Box>
                <Heading size='sm'>{firstName} {secondName}</Heading>
                <Text>{description}</Text>
            </Box>
        </Flex>
    )
}