import React, {useEffect} from 'react';
import {Center, Flex, Text, useDisclosure} from "@chakra-ui/react";
import {
    ContactsBlockDrawerContainer,
    MessagesWindow,
    OneProductDrawerContainer,
    PopupNotificationModal
} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {useParams, useSearchParams} from "react-router-dom";
import {
    allRoomsSelector, chatActions,
    getAllMessagesInRoomParticipantsFromOneRoomTC,
    getAllRoomsForCurrentUserTC,
    getOneProductTC,
    getRoomTC,
    messagesFromOneRoomSelector,
    newMessageRoomIdSelector,
    newMessageSelector,
    oneProductSelector,
    productActions,
    roomIdFromRoomSelector,
    updateProductEffectSelector,
    userIdFromSessionSelector
} from "@/store";


const ChatMainPage = () => {
    const {isOpen, onOpen, onClose} = useDisclosure();
    const [searchParams, setSearchParams] = useSearchParams(); //get params from url

    const sharerId = searchParams.get('s');
    const postId = searchParams.get('p');
    const requesterId = searchParams.get('r');
    const roomIdFromUrl = searchParams.get('room');
    const actions = useActionCreators({
        getOneProductTC,
        getRoomTC,
        getAllRoomsForCurrentUserTC,
        getAllMessagesInRoomParticipantsFromOneRoomTC, ...productActions,...chatActions
    })
    const oneProduct = useAppSelector(oneProductSelector);
    const userID = useAppSelector(userIdFromSessionSelector);
    const idRoomFromSelector = useAppSelector(roomIdFromRoomSelector);
    const messagesFromOneRoom = useAppSelector(messagesFromOneRoomSelector);
    const newMessage = useAppSelector(newMessageSelector);
    const newMessageRoomId = useAppSelector(newMessageRoomIdSelector);
    const updateProductEffect = useAppSelector(updateProductEffectSelector);
    const allRooms = useAppSelector(allRoomsSelector);

    console.log("chat")


    useEffect(() => {
        if (postId) {
            actions.getOneProductTC(Number(postId));
        }
        return () => {
            actions.clearOneProductState();
           actions.clearRoom();
        }
    }, [postId, updateProductEffect]);

    useEffect(() => {
        if (postId && sharerId && requesterId) {
            console.log("getRoom")
            actions.getRoomTC({sharerId, requesterId, postId})
        }
    }, [postId, sharerId, requesterId]);

    useEffect(() => {
        if (idRoomFromSelector) {
            console.log("getAllMessageOfRoom")
            actions.getAllMessagesInRoomParticipantsFromOneRoomTC(idRoomFromSelector)
        }
    }, [idRoomFromSelector, newMessage]);


    return (
        <Flex justify={"space-between"} px={7} mt="20vh">

            <ContactsBlockDrawerContainer
                allRooms={allRooms}
                newMessageRoomId={newMessageRoomId}
                roomIDFromUrl={roomIdFromUrl as string}
            />

            {postId ? <MessagesWindow
                    roomId={roomIdFromUrl as string}
                    requester={requesterId as string}
                    sharer={sharerId as string}
                    postID={postId as string}
                    messages={messagesFromOneRoom}
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
            {oneProduct?.map((product, id) => {
                console.log(product.post_published)
                return (
                    <OneProductDrawerContainer
                        roomId={roomIdFromUrl as string}
                        sharerId={sharerId as string}
                        requesterId={requesterId as string}
                        chat="chat"
                        product={product}
                        buttonValue={
                        // product.post_published && (sharerId === userID) ?
                        //     "approval pending" : !product.post_published && (sharerId === userID) ? "confirm pick up" :
                        //         "leave a feedBack"
                            product.post_published && (sharerId === userID) ?
                            "approval pending" :
                                // !product.post_published && (sharerId === userID) ? "confirm pick up" :
                                "leave a feedBack"
                    }
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


