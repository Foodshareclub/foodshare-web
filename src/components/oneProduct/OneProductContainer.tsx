import {InitialProductStateType} from "@/store/slices/productReducer";
import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useAppSelector} from "@/hook";
import {userIdFromSessionSelector} from "@/store";
import {supabase} from "@/supaBase.config";
import {PATH} from "@/utils";
import {OneProduct} from "@/components";

type OneProductContainerType = {
    product: InitialProductStateType
    buttonValue?: string
    chat?: string
}

type RoomType = {
    requester: string
    sharer: string
    post_id: number
    last_message: string
    last_message_sent_by: string
}

export const OneProductContainer: React.FC<OneProductContainerType> = ({
                                                                           chat = 'chat',
                                                                           product,
                                                                           buttonValue = 'Request'
                                                                       }) => {
    const {id} = useParams();

    const userID = useAppSelector(userIdFromSessionSelector);

    const [isRoomExist, setIsRoomExist] = useState<boolean>();


    useEffect(() => {  //to find out if a room exists or not
        if (id && userID) {
            (async () => {
                const {data} = await supabase
                    .from('rooms')
                    .select('*')
                    .match({requester: userID, post_id: id});
                setIsRoomExist(!!data?.length)
            })()
        }

        return () => setIsRoomExist(false)
    }, []);

    const navigate = useNavigate();

    const navigateHandler = () => {
        if (product.user === userID) {
            navigate(PATH.myListingsPage);
            return;
        }

        !isRoomExist && onCreateRoomHandler() //if room already exist, it isn't created
            .then(() => {
                navigate(`/chat-main/${product.id}?s=${product.user}&r=${userID}`);
            });
    }

    if (isRoomExist) {
        navigate(`/chat-main/${product.id}?s=${product.user}&r=${userID}`);
    }

    const onCreateRoomHandler = () => {
        const room = {
            requester: userID,
            sharer: product.user,
            post_id: product.id,
            last_message_sent_by: userID,
            last_message_seen_by: product.user,
            last_message: 'Initial message'
        } as RoomType;

        return supabase.from("rooms").insert(room);
    }

    return (
        <OneProduct
            navigateHandler={navigateHandler}
            chat={chat}
            product={product}
            buttonValue={buttonValue}
            key={id}
        />
    )
}