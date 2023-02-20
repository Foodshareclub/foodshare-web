import {InitialProductStateType} from "@/store/slices/productReducer";
import React, {useEffect} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useActionCreators, useAppSelector} from "@/hook";
import {createdSelector, userIdSelector} from "@/store";
import {PATH} from "@/utils";
import {OneProduct} from "@/components";
import {RoomType} from "@/api/chatAPI";
import {checkRoomAvailabilityTC, createRoomTC} from "@/store/slices/chatReducer";

type OneProductContainerType = {
    product: InitialProductStateType
    buttonValue?: string
}

export const OneProductContainer: React.FC<OneProductContainerType> = ({
                                                                           product,
                                                                           buttonValue = 'Request'
                                                                       }) => {
    const {id} = useParams();
    const navigate = useNavigate();
    const actions = useActionCreators({createRoomTC, checkRoomAvailabilityTC})
    const userID = useAppSelector(userIdSelector);
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
            last_message_seen_by: product.user,
            last_message: 'Initial message'
        } as RoomType;
        await actions.createRoomTC(room);
    }

    const navigateHandler = () => {
        if (product.user === userID) {
            navigate(PATH.myListingsPage);
            return;
        }
        if (isRoomExist) {
            navigate(`/chat-main/${product.id}?s=${product.user}&r=${userID}`);
        }
        !isRoomExist && createRoom() //if room already exist, it isn't created
            .then(() => {
                navigate(`/chat-main/${product.id}?s=${product.user}&r=${userID}`);
            });
    }

    return (
        <OneProduct
            navigateHandler={navigateHandler}
            product={product}
            buttonValue={buttonValue}
            key={id}
        />
    )
}