import React, {KeyboardEvent, useEffect, useRef, useState} from 'react';
import {Box, Button, Center, Flex, Input, Text, useDisclosure} from "@chakra-ui/react";
import {ContactsBlock, OneProduct, PopupNotificationModal} from "@/components";
import {useActionCreators, useAppSelector, useEvent} from "@/hook";
import {useParams, useSearchParams} from "react-router-dom";
import {getOneProductTC, InitialProductStateType} from "@/store/slices/productReducer";

import {AddIcon} from "@chakra-ui/icons";
import {supabase} from "@/supaBase.config";
import {userIdFromSessionSelector} from "@/store";


export type RoomParticipantsType = {
    id: string
    image: string | null
    profile_id: string | null
    room_id: string
    text: string | null
    timestamp: string
}
export type CustomRoomType = {
    id: string
    last_message: string
    last_message_seen_by: null
    last_message_sent_by: string
    last_message_time: string
    post_id: number
    posts: InitialProductStateType
    requester: string
    room_participants: Array<RoomParticipantsType>
    sharer: string
}
export type RoomType = {
    id: number
    last_message: string | null
    last_message_seen_by: string
    last_message_sent_by: string
    last_message_time: string
    post_id: number
    user_a: string
    user_b: string
}
const ChatMainPage = () => {
    const {id} = useParams();
    const [searchParams, setSearchParams] = useSearchParams(); //get params from url
    const sharerId = searchParams.get('s');
    const requesterId = searchParams.get('r');

    const {isOpen, onOpen, onClose} = useDisclosure();
    const actions = useActionCreators({getOneProductTC})
    const oneProduct = useAppSelector(state => state.product.oneProduct);
    const userID = useAppSelector(userIdFromSessionSelector);

    useEffect(() => {
        if (id) {
            actions.getOneProductTC(Number(id));
            onOpen()
        }
    }, [id]);

//////////////////////////////////////////////////////////////////

    const [currentConversationMessages, setCurrentConversationMessages] = useState<Array<RoomParticipantsType>>([]);
    const [room, setRoom] = useState<Array<CustomRoomType>>([] as Array<CustomRoomType>);
    useEffect(() => {
        if (id && sharerId && requesterId) {
            supabase
                .from("rooms") ///need to know roomID
                .select()
                .match({
                    sharer: sharerId,
                    requester: requesterId,
                    post_id: id
                }) // go throw oneProduct page you are a requester
                .then(res => {

                    res.data?.forEach(el => {
                        supabase
                            .from("room_participants") ///need to know roomID
                            .select()
                            .eq('room_id', el.id)
                            .order('timestamp', {ascending: true})
                            .then(res => {

                                setCurrentConversationMessages([...res.data as Array<RoomParticipantsType>])
                            })
                    })
                })
        }
    }, [id, sharerId, requesterId])

    const [anotherConversationsMessages, setAnotherConversationsMessages] = useState<Array<RoomParticipantsType>>([]);

    useEffect(() => {  //incoming message listener
        const channel = supabase
            .channel("*")
            .on(
                "postgres_changes",
                {event: "INSERT", schema: "public", table: "room_participants"},
                (payload: { new: RoomParticipantsType; }) => {
                    const newMessage = payload.new;

                    const isCurrentMessageRefersCurrentConversation = currentConversationMessages.some((message) => {
                        return message.room_id === newMessage.room_id;
                    });

                    if (isCurrentMessageRefersCurrentConversation) {
                        setCurrentConversationMessages([...currentConversationMessages, newMessage]);
                    } else {
                        setAnotherConversationsMessages([...anotherConversationsMessages, newMessage]);
                    }
                })
            .subscribe();
        return () => {
            supabase.removeChannel(channel).then(res => res);
        };
    }, [supabase, currentConversationMessages, anotherConversationsMessages]);

    useEffect(() => {
        supabase  ///get all rooms for current user to show all his conversations
            .from("rooms")
            .select(`"*", posts("*"), room_participants("*"), profiles!rooms_requester_fkey("*")`)
            .or(`sharer.eq.${userID}, requester.eq.${userID}`)
            .then(({data}: any) => {

                setRoom(data)
            })
    }, [])


    return (
        <Flex justify={"space-between"} px={7} mt="22vh" mb={"12vh"}>

            <ContactsBlock
                room={room}
                anotherRoomMessage={anotherConversationsMessages}
            />

            {id ? <MessagesWindow
                    requester={requesterId as string}
                    sharer={sharerId as string}
                    postID={id as string}
                    messages={currentConversationMessages}
                    userID={userID}
                />
                :
                <Flex
                    justify={"space-between"} flex={1} direction={"column"}
                    p={3} bg={"gray.200"} borderRadius={20}
                    ml={3} mr={3} height={'550px'}
                >
                    <Center>
                        <Text fontSize='3xl'>
                            Please select conversation
                        </Text>
                    </Center>
                </Flex>
            }

            {
                oneProduct?.map((product, id) => {
                    return (
                        <OneProduct chat="chat"
                                    product={product}
                                    buttonValue={"approval pending"}
                                    key={id}
                        />
                    )
                })
            }

            {/*<PopupNotificationModal isOpen={isOpen} onClose={onClose}/>*/}
        </Flex>
    );
};

export default ChatMainPage;


////////////////////////////////////////////     MessagesWindow

type MessagesWindowType = {
    messages: Array<RoomParticipantsType>
    requester: string
    sharer: string
    postID: string
    userID: string
}

export const MessagesWindow: React.FC<MessagesWindowType> = ({
                                                                 messages,
                                                                 requester, sharer,
                                                                 postID,
                                                                 userID
                                                             }) => {
    useEffect(() => {
        messagesAnchorRef.current?.scrollIntoView({behavior: 'smooth'}); //scroll down to show last message
    }, [messages]);

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
                                <Box my={2} bg={"white"} borderRadius={"25px"} maxWidth={"255px"}>
                                    <Text py={2} px={4}>
                                        {m.text}
                                    </Text>
                                </Box>
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


//////////////////////////////////////////////////////   InputSection
type InputSectionType = {
    messages: Array<RoomParticipantsType>
    requester: string
    sharer: string
    postID: string
}

export const InputSection: React.FC<InputSectionType> = ({messages, sharer, requester, postID}) => {
    const userID = useAppSelector(userIdFromSessionSelector);

    const [val, setVal] = useState('');

    const click = useEvent(async () => {
        const messageObject = {} as RoomParticipantsType;
        messages.forEach(m => {
            messageObject.room_id = m.room_id;
            messageObject.profile_id = userID;
        })

        if (val.trim()) {
            await supabase.from("room_participants").insert({...messageObject, text: val});
        }

        await supabase
            .from("rooms")
            .update({
                id: messageObject.room_id,
                last_message: val,
                post_id: Number(postID),
                sharer,
                requester
            })
            .eq('id', messageObject.room_id); ///update last_message in rooms

        setVal('');
    })

    const keyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            click()
        }
    }
    return (
        <>
            <Input
                onKeyDown={(e) => keyDown(e)}
                _hover={{bg: "white"}}
                variant={"filled"}
                borderRadius={20}
                type={'text'}
                placeholder='Enter...'
                value={val}
                onChange={(e) => setVal(e.target.value)}
                mr={2}
            />
            <Button
                onClick={click}
                as={AddIcon}
                borderRadius={20}
                colorScheme={"green"}
                p={2}
                backgroundColor='#FF2D55'
                color={"white"}
                variant={"solid"}>
            </Button>
        </>
    )
}


