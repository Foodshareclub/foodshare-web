import {InitialProductStateType, productActions} from "@/store/slices/productReducer";
import React, {useEffect} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useActionCreators, useAppSelector} from "@/hook";
import {createdSelector, userIdFromSessionSelector} from "@/store";
import {PATH} from "@/utils";
import {OneProduct} from "@/components";
import {RoomType} from "@/api/chatAPI";
import {checkRoomAvailabilityTC, createRoomTC} from "@/store/slices/chatReducer";

type OneProductContainerType = {
    product: InitialProductStateType
    buttonValue: string
}

export const OneProductContainer: React.FC<OneProductContainerType> = ({
                                                                           product,
                                                                           buttonValue
                                                                       }) => {
    const {id} = useParams();
    const navigate = useNavigate();
    const actions = useActionCreators({createRoomTC, checkRoomAvailabilityTC,...productActions})
    const createdRoom = useAppSelector(state => state.chat.createdRoom);
    const userID = useAppSelector(userIdFromSessionSelector);
    const isExist = useAppSelector(createdSelector)
    const isRoomExist = isExist === "created";

    console.log(isRoomExist)
    console.log(createdRoom[0]?.id)

    useEffect(() => {  //to find out if a room exists or not
        if (id && userID) {
            const arg = {
                userID, postID: id
            }
            actions.checkRoomAvailabilityTC(arg)
        }
        return console.log('dead oneProdContainer')
    }, [id]);

    const createRoom = async () => {
        const room = {
            requester: userID,
            sharer: product.user,
            post_id: product.id,
            last_message_sent_by: userID,
            last_message_seen_by: userID,
            last_message: 'Initial message'
        } as RoomType;
        await actions.createRoomTC(room);
    }

    const navigateHandler = async () => {
        if (product.user === userID) {
            navigate(PATH.myListingsPage);
            return;
        }
        if (isRoomExist) {
            navigate(`/chat-main/${product.id}?s=${product.user}&r=${userID}&room=${createdRoom[0]?.id}`);
        }
        if (!isRoomExist) {
            await createRoom()
        } //if room already exist, it isn't created
    }

    return (
        <OneProduct
            isRoomExist={isRoomExist}
            navigateHandler={navigateHandler}
            product={product}
            buttonValue={buttonValue}
            key={id}
        />
    )
}