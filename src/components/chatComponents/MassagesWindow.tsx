import React, {useEffect, useRef} from "react";
import {Avatar, Box, Flex, Text} from "@chakra-ui/react";
import {InputSection} from "@/components/chatComponents/InputSection";
import {RoomParticipantsType} from "@/api/chatAPI";
import {useAppSelector} from "@/hook";
import {allRoomsSelector, requesterSelector} from "@/store/slices/chatSelectors";
import {avatarURLSelector} from "@/store";

type MessagesWindowType = {
    messages: Array<RoomParticipantsType>
    requester: string
    sharer: string
    postID: string
    userID: string
    roomId: string
}
export const MessagesWindow: React.FC<MessagesWindowType> = ({
                                                                 messages,
                                                                 requester, sharer,
                                                                 postID,
                                                                 userID, roomId
                                                             }) => {
    useEffect(() => {
        messagesAnchorRef.current?.scrollIntoView({behavior: 'smooth'}); //scroll down to show last message
    }, [messages]);
    const requesterImg = useAppSelector(requesterSelector);
    const userImg = useAppSelector(avatarURLSelector)
    const allRooms = useAppSelector(allRoomsSelector)
    const currentRoom = allRooms.find(room => room.id === roomId)

    const messagesAnchorRef = useRef<HTMLDivElement>(null);
    return (
        <Flex
            justify={"space-between"} flex={1} direction={"column"}
            p={3} bg={"gray.200"} borderRadius={20}
            ml={3} mr={3} height={'550px'}
        >
            <Box p={3} borderRadius={20} bg={"gray.100"} h={"90%"} overflow={"auto"}>
                {messages && messages
                    .filter(m => m.text !== '') //remove initial message
                    .map((m) => {
                        let time = new Date(m.timestamp).toLocaleTimeString()
                        return userID === m.profile_id
                            ? <Flex justify={"end"} key={m.id}>
                                <Text color={"gray.400"}>
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
                                    <Avatar alignSelf={"center"} size={"xs"}
                                            src={userImg === requesterImg ?
                                                currentRoom?.profiles.avatar_url :
                                                requesterImg}/>
                                    <Text py={2} px={4}>
                                        {m.text}
                                    </Text>
                                </Flex>
                                <Text color={"gray.400"}>
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
}
