import {useActionCreators, useAppSelector} from "@/hook";
import {avatarURLSelector, updateRoomTC, userFirstNameSelector, userSecondNameSelector} from "@/store";
import AvatarWithRipple from "@/components/listingPersonCard/AvatarWithRipple";
import {Box, Flex, Heading, Input, InputGroup, InputLeftElement} from "@chakra-ui/react";
import {SearchIcon} from "@chakra-ui/icons";
import {t} from "@lingui/macro";
import {MinifiedUserInfo} from "@/components";
import React, {memo} from "react";
import {useNavigate} from "react-router-dom";

import {CustomRoomType} from "@/api/chatAPI";

export type ContactsBlockType = {
    userID:string
    roomIDFromUrl: string
    newMessageRoomId: string
    allRooms: Array<CustomRoomType>
}

const ContactsBlock: React.FC<ContactsBlockType> = memo(({allRooms, roomIDFromUrl, newMessageRoomId,userID}) => {

    const actions = useActionCreators({updateRoomTC})
    const imgUrl = useAppSelector(avatarURLSelector);
    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);

    const navigate = useNavigate();

    const onGetCurrentUserMessages = async (post_id: number, sharerId: string, requesterId: string, roomId: string) => {
        if (roomId === roomIDFromUrl) {
            return
        } else {
            navigate(`/chat-main/?p=${post_id}&s=${sharerId}&r=${requesterId}&room=${roomId}`);
        }
        await actions.updateRoomTC({last_message_seen_by: userID, id: roomId})
    };

    return (
        <Flex
            w={{xl:"18vw",base:"auto"}}
            py={3} pr={3}
            direction={"column"}
        >
            <Flex direction={"column"} alignSelf={"center"}>
                <AvatarWithRipple img={imgUrl}/>
                <Box py={2}>
                    <Heading textAlign={"center"} size='md'>
                        {userFirstName} {userSecondName}
                    </Heading>
                </Box>
                <InputGroup
                    w={"90%"}
                    alignSelf="center"
                    alignItems="center"
                    mb={5}>
                    <InputLeftElement
                        pointerEvents={"stroke"}
                        children={<SearchIcon
                        />}
                    />
                    <Input
                        placeholder={t({
                            id: `msg.Search...`,
                            message: `Search...`
                        })}
                    />
                </InputGroup>
            </Flex>
            <Flex direction={"column"} alignSelf={"center"}
                 w={'100%'}
            >
                <Box
                    borderRadius={"10%"}
                    px={2}
                    maxH={"350px"}
                    overflow={"auto"}>
                    {allRooms.map((data) => {
                        return (
                            <MinifiedUserInfo
                                lastUserSeen={data.last_message_seen_by}
                                userId={userID}
                                newMessageRoomId={newMessageRoomId}
                                roomIDFromUrl={roomIDFromUrl}
                                key={data.id}
                                onGetCurrentUserMessages={() => onGetCurrentUserMessages(data.posts.id, data.sharer, data.requester, data.id)}
                                src={data.posts.gif_url}
                                description={data.posts.post_name}
                                firstName={data.profiles.first_name}
                                secondName={data.profiles.second_name}
                                roomId={data.id}
                            />
                        )
                    })}
                </Box>
            </Flex>
        </Flex>
    )
})
export default ContactsBlock;