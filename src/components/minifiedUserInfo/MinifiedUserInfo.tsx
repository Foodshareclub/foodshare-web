import * as React from "react";
import {Avatar, Box, Flex, Heading, Text} from "@chakra-ui/react";
import {RoomParticipantsType} from "@/pages/chat/ChatMainPage";
import {useEffect, useState} from "react";

type MinifiedUserInfoType = {
    src: string
    firstName?: string
    secondName?: string
    description?: string
    onGetCurrentUserMessages?: () => void
    anotherRoomMessage?: Array<RoomParticipantsType>
    roomId?: string
}

export const MinifiedUserInfo: React.FC<MinifiedUserInfoType> = ({
                                                                     src,
                                                                     firstName,
                                                                     secondName,
                                                                     description,
                                                                     onGetCurrentUserMessages,
                                                                     anotherRoomMessage,
                                                                     roomId
}) => {
    const [tag, setTag] = useState(false);



    useEffect(() => {
        const point = anotherRoomMessage?.some(r => r.room_id === roomId) as boolean; //choose room with new message

        if (point) {
            setTag(true); //show conversation with new message
        }
    }, [anotherRoomMessage]); //check every new message




    const onClick = () => {
        if (onGetCurrentUserMessages) {
            onGetCurrentUserMessages();
        }
        setTag(false);
        anotherRoomMessage?.filter(r => r.room_id !== roomId); //remove viewed message
    }

    return (
        <Flex
            cursor={"pointer"} borderRadius={"5%"} _hover={{bg: "white"}}
            py={2} flex='1' gap='4'
            px={2} alignItems='center' flexWrap='wrap'
            onClick={onClick}
            bg={(tag) ? "red.500" : ""}
        >
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