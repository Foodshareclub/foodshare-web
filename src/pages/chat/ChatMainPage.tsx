import React, {useEffect} from 'react';
import {Center, Flex, Text} from "@chakra-ui/react";
import {ContactsBlock, OneProduct} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {useParams, useSearchParams} from "react-router-dom";
import {getOneProductTC, productActions} from "@/store/slices/productReducer";
import {MessagesWindow} from "@/components/chatComponents/MassagesWindow";
import {
    getAllMessagesInRoomParticipantsFromOneRoomTC,
    getAllRoomsForCurrentUserTC,
    getRoomTC
} from "@/store/slices/chatReducer";
import {
    allRoomsSelector,
    messagesFromOneRoomSelector,
    newMessageRoomIdSelector,
    newMessageSelector,
    oneProductSelector,
    roomSelector,
    userIdFromSessionSelector
} from "@/store";

const ChatMainPage = () => {
    const {id} = useParams();
    const [searchParams, setSearchParams] = useSearchParams(); //get params from url
    const sharerId = searchParams.get('s');
    const requesterId = searchParams.get('r');
    const roomId = searchParams.get('room');
    const actions = useActionCreators({
        getOneProductTC,
        getRoomTC,
        getAllRoomsForCurrentUserTC,
        getAllMessagesInRoomParticipantsFromOneRoomTC, ...productActions
    })
    const oneProduct = useAppSelector(oneProductSelector);
    const userID = useAppSelector(userIdFromSessionSelector);
    const room = useAppSelector(roomSelector);
    const messagesFromOneRoom = useAppSelector(messagesFromOneRoomSelector);
    const newMessage = useAppSelector(newMessageSelector);
    const newMessageRoomId = useAppSelector(newMessageRoomIdSelector);

    const allRooms = useAppSelector(allRoomsSelector)

    // const updateRoomStatus = useAppSelector(updateRoomStatusSelector);
    // const isRoomUpdated = updateRoomStatus === "updated";


    useEffect(() => {
        if (id) {
            actions.getOneProductTC(Number(id));
        }
        return () => {
            actions.clearOneProductState()
        }
    }, [id])

    useEffect(() => {
        if (id && sharerId && requesterId) {
            actions.getRoomTC({sharerId, requesterId, postId: id})
        }
    }, [id, sharerId, requesterId])

    useEffect(() => {
        if (room?.id) {
            actions.getAllMessagesInRoomParticipantsFromOneRoomTC(room.id)
        }
    }, [room?.id, newMessage])

    return (
        <Flex justify={"space-between"} px={7} mt="22vh" mb={"12vh"}>

            <ContactsBlock
                allRooms={allRooms}
                newMessageRoomId={newMessageRoomId}
                roomIDFromUrl={roomId as string}
            />

            {id ? <MessagesWindow
                    roomId={roomId as string}
                    requester={requesterId as string}
                    sharer={sharerId as string}
                    postID={id as string}
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


