import * as React from "react";
import {memo} from "react";
import {Avatar, Box, Flex, Heading, Text} from "@chakra-ui/react";
import {useActionCreators} from "@/hook";
import {updateRoomTC} from "@/store/slices/chatReducer";

type MinifiedUserInfoType = {
    userId?: string
    src: string
    firstName?: string
    secondName?: string
    onGetCurrentUserMessages?: () => void
    roomId?: string
    roomIDFromUrl?: string
    newMessageRoomId?: string
    description?: string
    lastUserSeen?: string

}

export const MinifiedUserInfo: React.FC<MinifiedUserInfoType> = memo(({
                                                                          src,
                                                                          firstName,
                                                                          secondName,
                                                                          description,
                                                                          onGetCurrentUserMessages,
                                                                          roomId,
                                                                          roomIDFromUrl,
                                                                          userId, lastUserSeen
                                                                      }) => {


    const actions = useActionCreators({updateRoomTC})

    const onClick = async () => {
        if (onGetCurrentUserMessages) {
            onGetCurrentUserMessages();

            await actions.updateRoomTC({last_message_seen_by: userId as string, id: roomId as string})
        }
        console.log("clickInMinifiedUserInfo")
    }

    return (
        <Flex
            cursor={"pointer"} borderRadius={"5%"}
            _hover={{bg: "gray.100"}}
            py={2}
            gap='4'
            px={2} alignItems='center'
            onClick={onClick}
        >
            {lastUserSeen === userId ?
                <Avatar
                    name={firstName}
                    src={src}
                /> :
                <Avatar
                    name={firstName}
                    src={src}
                    _after={{
                        content: '""', w: 4, h: 4, bg: 'green.300', border: '2px solid white',
                        rounded: 'full', pos: 'absolute', bottom: 0, right: 0,
                    }}
                />
            }

            <Box opacity={roomIDFromUrl === roomId ? "100%" : "40%"}>
                <Heading size='sm'>{description}</Heading>
                <Text>{firstName} {secondName}</Text>
            </Box>
        </Flex>
    )
})