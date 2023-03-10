import {productActions} from "@/store/slices/productReducer";
import React, {useEffect} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useActionCreators, useAppSelector} from "@/hook";
import {checkRoomAvailabilityTC, createdSelector, createRoomTC, userIdFromSessionSelector} from "@/store";
import {PATH} from "@/utils";
import {RoomType} from "@/api/chatAPI";
import {OneProduct} from "@/components";
import {InitialProductStateType} from "@/api/productAPI";


type OneProductContainerType = {
    product: InitialProductStateType
}

export const OneProductContainer: React.FC<OneProductContainerType> = ({
                                                                           product
                                                                       }) => {
    const {id} = useParams();
    const navigate = useNavigate();
    const actions = useActionCreators({createRoomTC, checkRoomAvailabilityTC,...productActions});
    const createdRoom = useAppSelector(state => state.chat.createdRoom);
    const userID = useAppSelector(userIdFromSessionSelector);
    const isExist = useAppSelector(createdSelector)
    const isRoomExist = isExist === "created";

    useEffect(() => {  //to find out if a room exists or not
        if (id && userID) {
            const arg = {
                userID, postID: id
            }
            actions.checkRoomAvailabilityTC(arg)
        }
        return console.log('dead oneProdContainer')
    }, []);

    const createRoom = async () => {
        const room = {
            requester: userID,
            sharer: product.user,
            post_id: product.id,
            last_message_sent_by: userID,
            last_message_seen_by: userID,
            last_message: 'Initial message'
        } as RoomType;
     await actions.createRoomTC(room)
    }

    const navigateHandler = async () => {
        if (product.user === userID) {
            navigate(PATH.myListingsPage);
            return;
        }
        if (!isRoomExist) {
        await createRoom()
        }
        if (isRoomExist) {
            navigate(`/chat-main/?p=${product.id}&s=${product.user}&r=${userID}&room=${createdRoom[0]?.id}`);
        }
    }

    return (
        <OneProduct
            navigateHandler={navigateHandler}
            product={product}
            buttonValue={product.user === userID? 'go to my listings':isRoomExist ? "go to chat" : "request"}
            key={id}
        />
    )
}