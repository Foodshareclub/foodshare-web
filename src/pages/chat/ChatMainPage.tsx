import React, {KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Box, Button, Flex, Input, Text, useDisclosure} from "@chakra-ui/react";
import {OneProduct, PopupNotificationModal} from "@/components";
import {useActionCreators, useAppSelector, useEvent} from "@/hook";
import {useParams, useSearchParams} from "react-router-dom";
import {getOneProductTC, InitialProductStateType} from "@/store/slices/productReducer";

import {AddIcon} from "@chakra-ui/icons";
import {supabase} from "@/supaBase.config";
import {userIdFromSessionSelector} from "@/store";
import ContactsBlock from "@/components/chatComponents/ContactsBlock";


export type RoomParticipantsType = {
    id: number
    image: string | null
    profile_id: string | null
    room_id: number
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

    const [messages, setMessages] = useState<Array<RoomParticipantsType>>([]);
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
                //.or(`sharer.eq.${sharerId}, requester.eq.${userID}, post_id.eq.${id}`)
                .then(res => {
                    console.log(res.data, "from rooms")
                    res.data?.forEach(el => {

                        supabase
                            .from("room_participants") ///need to know roomID
                            .select()
                            .eq('room_id', el.id)
                            .then(res => {

                                console.log(res.data)
                                setMessages([...res.data as Array<RoomParticipantsType>])
                                // console.log(res.data)
                                // console.log('data2: ')
                            })
                    })
                })
        }
    }, [id, sharerId, requesterId])

    console.log(messages, "from table")

    const [anotherRoomMessage, setAnotherRoomMessage] = useState<Array<RoomParticipantsType>>([]);

    useEffect(() => {  //incoming message listener
        const channel = supabase
            .channel("*")
            .on(
                "postgres_changes",
                {event: "INSERT", schema: "public", table: "room_participants"},
                (payload: { new: RoomParticipantsType; }) => {
                    const newMessage = payload.new;

                    const isMessageNew = messages.some((message) => {
                        return message.room_id === newMessage.room_id;
                    });
                    console.log(newMessage)

                    if (isMessageNew) {
                        setMessages([...messages, newMessage]);
                    } else {
                        setAnotherRoomMessage([...anotherRoomMessage, newMessage]);
                    }
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel).then(res => console.log(res));
        };
    }, [supabase, messages, setMessages]);


    useEffect(() => {
        supabase  ///get all rooms for current user to show all his conversations
            .from("rooms")
            .select('"*", posts("*"), room_participants("*")')
            .or(`sharer.eq.${userID}, requester.eq.${userID}`)
            .then(({data}: any) => {
                console.log(data)
                setRoom(data)
            })
    }, [])


    useEffect(() => {
        messagesAnchorRef.current?.scrollIntoView({behavior: 'smooth'}); //scroll down to show last message
    }, [messages]);

    const messagesAnchorRef = useRef<HTMLDivElement>(null);

    return (
        <Flex justify={"space-between"} px={7} mt="24vh" mb={"12vh"}>

            <ContactsBlock
                room={room}
                anotherRoomMessage={anotherRoomMessage}
            />

            <Flex justify={"space-between"} direction={"column"} p={3} bg={"gray.200"} borderRadius={20} w={"50%"}
                  height={'500px'}>
                <Box p={3} borderRadius={20} bg={"gray.100"} h={"90%"} overflow={"auto"}>
                    {messages && messages
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
                    <InputSection messages={messages}/>
                </Flex>

            </Flex>
            {
                oneProduct?.map((product, id) => {
                    return <OneProduct chat="chat"
                                       product={product}
                                       buttonValue={"approval pending"}
                                       key={id}
                    />
                })}
            {/*<PopupNotificationModal isOpen={isOpen} onClose={onClose}/>*/}
        </Flex>
    );
};

export default ChatMainPage;


type InputSectionType = {
    messages: Array<RoomParticipantsType>
}

export const InputSection: React.FC<InputSectionType> = ({messages}) => {
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

        //await supabase.from("rooms").insert({id: messageObject.room_id, last_message: val}); ///update last_message in rooms, add sharerID, requesterID
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


