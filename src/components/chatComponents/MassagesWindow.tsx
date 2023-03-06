import React, {memo, useEffect, useRef} from "react";
import {Avatar, Box, Flex, Text, Tooltip} from "@chakra-ui/react";
import {RoomParticipantsType} from "@/api/chatAPI";
import {useAppSelector, useMediaQuery} from "@/hook";
import {
    allRoomsSelector,
    avatarURLSelector,
    requesterIdSelector,
    requesterNameSelector,
    requesterSelector
} from "@/store";
import {useNavigate} from "react-router-dom";
import {InputSection} from "@/components";

type MessagesWindowType = {
    messages: Array<RoomParticipantsType>
    userID: string
    roomId: string
}

const scroll = {
    "::-webkit-scrollbar": {width: "4px", borderRadius: "10px", backgroundColor: "#f9f9fd"},
    "::-webkit-scrollbar-thumb": {borderRadius: "10px", backgroundColor: "lightgray"},
    "::-webkit-scrollbar-track": {
        boxShadow: "inset 0 0 6px rgba(0,0,0,0.2)",
        borderRadius: "10px",
        backgroundColor: "#f9f9fd"
    },
}
export const MessagesWindow: React.FC<MessagesWindowType> = memo(({
                                                                      messages,
                                                                      userID, roomId
                                                                  }) => {
    useEffect(() => {
        messagesAnchorRef.current?.scrollIntoView({behavior: 'smooth'}); //scroll down to show last message
    }, [messages]);
    const navigate = useNavigate()
    const isSmaller = useMediaQuery('(min-width:1200px)');

    const requesterImg = useAppSelector(requesterSelector);
    const requesterId = useAppSelector(requesterIdSelector);
    const requesterName = useAppSelector(requesterNameSelector);

    const userImg = useAppSelector(avatarURLSelector)
    const allRooms = useAppSelector(allRoomsSelector)
    const currentRoom = allRooms.find(room => room.id === roomId)

    const messagesAnchorRef = useRef<HTMLDivElement>(null);

    const goToUser = (id: string | undefined) => navigate(`/volunteer/${id}`)
    return (
        <Flex
            w={isSmaller ? "52vw" : "100vw"}
            mx={3}
            borderRadius={6}
            justify={"space-between"}
            direction={"column"}
            p={3}
            bg={"gray.200"}
        >
            <Box
                sx={scroll}
                h={"60vh"}
                overflowY={"scroll"}>
                {messages && messages
                    .filter(m => m.text !== '') //remove initial message
                    .map((m) => {
                        let time = new Date(m.timestamp as string).toLocaleTimeString() as string
                        return userID === m.profile_id ?
                            <Flex justify={"end"} key={m.id}>
                                <Text fontSize={"10px"} color={"gray.400"}>
                                    {time}
                                </Text>
                                <Box m={2} bg={"red.100"} borderRadius={"25px"} maxWidth={"255px"}>
                                    <Text px={4} py={2}>
                                        {m.text}
                                    </Text>
                                </Box>
                            </Flex>

                            : <Flex justify={"start"} key={m.id}>

                                <Flex my={2} bg={"white"} borderRadius={"25px"} maxWidth={"255px"}>
                                    <Tooltip
                                        bg='gray.300'
                                        color='black'
                                        hasArrow
                                        label={userImg === requesterImg ?
                                            currentRoom?.profiles.first_name :
                                            requesterName}
                                    >
                                        <Avatar
                                            cursor={"pointer"}
                                            onClick={() => {
                                                if (userImg === requesterImg) {
                                                    goToUser(currentRoom?.profiles.id)
                                                } else {
                                                    goToUser(requesterId)
                                                }
                                            }}
                                            alignSelf={"center"}
                                            size={"xs"}
                                            src={userImg === requesterImg ?
                                                currentRoom?.profiles.avatar_url :
                                                requesterImg}/></Tooltip>
                                    <Text py={2} px={4}>
                                        {m.text}
                                    </Text>
                                </Flex>
                                <Text fontSize={"10px"} color={"gray.400"}>
                                    {time}
                                </Text>
                            </Flex>
                    })}
                <Box ref={messagesAnchorRef}></Box>
            </Box>
            <Flex pt={3}>
                <InputSection
                    roomId={roomId}
                    userID={userID}
                />
            </Flex>
        </Flex>
    )
})
