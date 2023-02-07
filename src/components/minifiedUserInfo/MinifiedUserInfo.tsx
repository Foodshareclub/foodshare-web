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
        <Flex flex='1' gap='4' alignItems='center' flexWrap='wrap'>
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