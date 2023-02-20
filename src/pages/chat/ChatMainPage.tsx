import React, {useEffect, useState} from 'react';
import {Center, Flex, Text} from "@chakra-ui/react";
import {ContactsBlock, OneProduct} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {useParams, useSearchParams} from "react-router-dom";
import {getOneProductTC} from "@/store/slices/productReducer";
import {supabase} from "@/supaBase.config";
import {MessagesWindow} from "@/components/chatComponents/MassagesWindow";
import {
    getAllMessagesInRoomParticipantsFromOneRoomTC,
    getAllRoomsForCurrentUserTC,
    getRoomTC
} from "@/store/slices/chatReducer";
import {RoomParticipantsType} from "@/api/chatAPI";
import {oneProductSelector, userIdFromSessionSelector} from "@/store";

const ChatMainPage = () => {
    const {id} = useParams();
    const [searchParams, setSearchParams] = useSearchParams(); //get params from url
    const sharerId = searchParams.get('s');
    const requesterId = searchParams.get('r');

    const actions = useActionCreators({
        getOneProductTC,
        getRoomTC,
        getAllRoomsForCurrentUserTC,
        getAllMessagesInRoomParticipantsFromOneRoomTC
    })
    const oneProduct = useAppSelector(oneProductSelector);
    const userID = useAppSelector(userIdFromSessionSelector);

    useEffect(() => {
        if (id) {
            actions.getOneProductTC(Number(id));
        }
    }, [id])
    useEffect(() => {
        actions.getAllRoomsForCurrentUserTC(userID)
    }, [])

    const [currentConversationMessages, setCurrentConversationMessages] = useState<Array<RoomParticipantsType>>([]);

    useEffect(() => {
        if (id && sharerId && requesterId) {
            actions.getRoomTC({sharerId, requesterId, postId: id}).unwrap()
                .then((res) => {
                    res?.forEach((el: { id: string; }) => {
                        actions.getAllMessagesInRoomParticipantsFromOneRoomTC(el.id).unwrap()
                            .then((res) => {
                                setCurrentConversationMessages([...res as Array<RoomParticipantsType>])
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


    return (
        <Flex justify={"space-between"} px={7} mt="22vh" mb={"12vh"}>

            <ContactsBlock

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


