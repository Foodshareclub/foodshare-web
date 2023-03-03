import React, {useEffect} from 'react';
import {Center, Flex, Text} from "@chakra-ui/react";
import {ContactsBlockDrawerContainer, MessagesWindow, OneProductDrawerContainer} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {useSearchParams} from "react-router-dom";
import {
    allRoomsSelector,
    chatActions, feedBackStatusSelector,
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

    const [searchParams, setSearchParams] = useSearchParams(); //get params from url

    const sharerId = searchParams.get('s');
    const postId = searchParams.get('p');
    const requesterId = searchParams.get('r');
    const roomIdFromUrl = searchParams.get('room');

    const actions = useActionCreators({
        getOneProductTC,
        getRoomTC,
        getAllRoomsForCurrentUserTC,
        getAllMessagesInRoomParticipantsFromOneRoomTC, ...productActions, ...chatActions
    })

    const userID = useAppSelector(userIdFromSessionSelector);
    const idRoomFromSelector = useAppSelector(roomIdFromRoomSelector);
    const messagesFromOneRoom = useAppSelector(messagesFromOneRoomSelector);
    const newMessage = useAppSelector(newMessageSelector);
    const newMessageRoomId = useAppSelector(newMessageRoomIdSelector);
    const updateProductEffect = useAppSelector(updateProductEffectSelector);
    const allRooms = useAppSelector(allRoomsSelector);
    const feedBackStatus = useAppSelector(feedBackStatusSelector);
    const oneProduct = useAppSelector(oneProductSelector);
    const anotherId = sharerId === userID ? requesterId : sharerId;
    const oneProductWithoutReview = oneProduct?.reviews?.some(item => item.profile_id === anotherId);
    console.log(oneProductWithoutReview)
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
            actions.getRoomTC({sharerId, requesterId, postId})
        }
    }, [postId, sharerId, requesterId]);

    useEffect(() => {
        if (idRoomFromSelector) {
            actions.getAllMessagesInRoomParticipantsFromOneRoomTC(idRoomFromSelector)
        }
    }, [idRoomFromSelector, newMessage]);


    return (
        <Flex
            justify={{xl: "start", xxl: "center"}}
            px={{xl:20,base:7}}  mt="20vh">

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
                    borderRadius={6}
                    justify={"space-between"}
                    flex={1}
                    direction={"column"}
                    p={3}
                    bg={"gray.200"}
                    h={"550px"}
                >
                    <Center>
                        <Text fontSize='3xl'>
                            Please select conversation
                        </Text>
                    </Center>
                </Flex>
            }
            {oneProduct && <OneProductDrawerContainer
                messagesFromOneRoom={messagesFromOneRoom}
                roomId={roomIdFromUrl as string}
                sharerId={sharerId as string}
                requesterId={requesterId as string}
                chat="chat"
                product={oneProduct}
                buttonValue={
                    (oneProduct.post_published && (sharerId === userID)) ?
                        "approval pending" :
                        (oneProductWithoutReview || (feedBackStatus === "written")) ?
                            "completed" : "leave a feedBack"
                }
            />}

        </Flex>
    );
};

export default ChatMainPage;


