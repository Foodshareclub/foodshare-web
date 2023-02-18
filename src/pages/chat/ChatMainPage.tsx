import React, {useEffect, useState} from 'react';
import {Center, Flex, Text} from "@chakra-ui/react";
import {ContactsBlock, OneProduct} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {useParams, useSearchParams} from "react-router-dom";
import {getOneProductTC, InitialProductStateType} from "@/store/slices/productReducer";
import {supabase} from "@/supaBase.config";
import {MessagesWindow} from "@/components/chatComponents/MassagesWindow";


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

    const actions = useActionCreators({getOneProductTC})
    const oneProduct = useAppSelector(state => state.product.oneProduct);
    const userID = useAppSelector(state => state.user.session?.user.id);
    console.log(123123123)
    useEffect(() => {
        if (id) {
            actions.getOneProductTC(Number(id));
        }
    }, [id]);

//////////////////////////////////////////////////////////////////

    const [currentConversationMessages, setCurrentConversationMessages] = useState<Array<RoomParticipantsType>>([]);
    //console.log(currentConversationMessages)
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
                        console.log(el.id)
                        supabase
                            .from("room_participants") ///need to know roomID
                            .select()
                            .eq('room_id', el.id)
                            .order('timestamp', {ascending: true})
                            .then(res => {
                                console.log(res)
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
                        console.log(newMessage)
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


