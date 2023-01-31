import React from "react";
import {useNavigate} from "react-router-dom";
import {Avatar, Box, Flex, Text} from "@chakra-ui/react";

type SettingsCardType = {
    imgSRC: string
    settingTitle: string
    description: string
    route: string
}

export const SettingsCard: React.FC<SettingsCardType> = ({
                                                             imgSRC,
                                                             settingTitle,
                                                             description,
                                                             route
                                                         }) => {
    const navigate = useNavigate();

    const onNavigateHandler = () => navigate(route);

    return (
        <Flex>
            <Box
                ml='3'
                boxShadow={'0px 5px 10px 2px rgba(34, 60, 80, 0.2)'}
                p={4}
                w={'100%'}
                cursor={"pointer"}
                onClick={onNavigateHandler}
            >
                <Avatar src={imgSRC} mb={2}/>

                <Text fontWeight='bold' mb={2}>
                    {settingTitle}
                </Text>

                <Text fontSize='sm' mb={2}>
                    {description}
                </Text>
            </Box>
        </Flex>
    );
};
