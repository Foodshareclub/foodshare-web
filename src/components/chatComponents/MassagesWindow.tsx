import React, {memo, useEffect, useRef} from "react";
import {Avatar, Box, Flex, Text, Tooltip} from "@chakra-ui/react";
import {RoomParticipantsType} from "@/api/chatAPI";
import {useAppSelector} from "@/hook";
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
    requester: string
    sharer: string
    postID: string
    userID: string
    roomId: string
}
export const MessagesWindow: React.FC<MessagesWindowType> = memo(({
                                                                      messages,
                                                                      requester, sharer,
                                                                      postID,
                                                                      userID, roomId
                                                                  }) => {
    useEffect(() => {
        messagesAnchorRef.current?.scrollIntoView({behavior: 'smooth'}); //scroll down to show last message
    }, [messages]);
    const navigate = useNavigate()

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
            justify={"space-between"}
            flex={1}
            direction={"column"}
            p={3} bg={"gray.200"} borderRadius={20}
            ml={3} mr={3}
            height={'550px'}
        >
            <Box p={3} borderRadius={20} bg={"gray.100"} h={"90%"} overflow={"auto"}>
                {messages && messages
                    .filter(m => m.text !== '') //remove initial message
                    .map((m) => {
                        let time = new Date(m.timestamp as string).toLocaleTimeString() as string
                        return userID === m.profile_id
                            ? <Flex justify={"end"} key={m.id}>
                                <Text fontSize={"10px"} color={"gray.400"}>
                                    {time}
                                </Text>
                                <Box my={2} bg={"red.100"} borderRadius={"25px"} maxWidth={"255px"}>
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

            <Flex borderRadius={20} h={"7%"} bg={"gray.200"}>
                <InputSection
                    messages={messages}
                    requester={requester as string}
                    sharer={sharer as string}
                    postID={postID as string}
                />
            </Flex>
        </Flex>
    )
})
