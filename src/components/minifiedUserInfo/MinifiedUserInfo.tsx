import * as React from "react";
import {Avatar, Box, Flex, Heading, Text} from "@chakra-ui/react";

import {useEffect, useState} from "react";
import {RoomParticipantsType} from "@/api/chatAPI";

type MinifiedUserInfoType = {
    src: string
    firstName?: string
    secondName?: string
    description?: string
    onGetCurrentUserMessages?: () => void
    anotherRoomMessage?: Array<RoomParticipantsType>
    roomId?: string
    postIDFromUrl?: string
    postIDFromData?: string
}

export const MinifiedUserInfo: React.FC<MinifiedUserInfoType> = ({
                                                                     src,
                                                                     firstName,
                                                                     secondName,
                                                                     description,
                                                                     onGetCurrentUserMessages,
                                                                     anotherRoomMessage,
                                                                     roomId,
                                                                     postIDFromUrl,
                                                                     postIDFromData
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
            py={2}
            gap='4'
            px={2} alignItems='center'
            onClick={onClick}
        >
            {tag? <Avatar
                    name={firstName}
                    src={src}
                    _after={{content: '""', w: 4, h: 4, bg: 'green.300', border: '2px solid white',
                        rounded: 'full', pos: 'absolute', bottom: 0, right: 0,}}
                />:
                <Avatar
                name={firstName}
                src={src}
                />
            }

            <Box opacity={postIDFromUrl === postIDFromData ? "100%" : "40%"}>
                <Heading size='sm'>{description}</Heading>
                <Text>{firstName} {secondName}</Text>
            </Box>
        </Flex>
    )
}