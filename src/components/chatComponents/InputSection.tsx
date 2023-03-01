import React, {KeyboardEvent, memo, useState} from "react";
import {useActionCreators, useAppSelector} from "@/hook";
import {Button, Input} from "@chakra-ui/react";
import {RoomParticipantsType} from "@/api/chatAPI";
import {createPostInRoomTC, updateRoomTC} from "@/store/slices/chatReducer";


type InputSectionType = {
    messages: Array<RoomParticipantsType>
    requester: string
    sharer: string
    postID: string
}
export const InputSection: React.FC<InputSectionType> = memo(({messages, sharer, requester, postID}) => {
    const userID = useAppSelector(state => state.user.session?.user.id);
    const actions = useActionCreators({createPostInRoomTC, updateRoomTC})
    const [val, setVal] = useState('');


    const click = async () => {
        const oneNewMessage = {room_id: messages[0].room_id, profile_id: userID};
        const roomForUpdate = {
            id: oneNewMessage.room_id,
            last_message: val,
            last_message_sent_by: userID,
            last_message_seen_by: userID,
            post_id: Number(postID),
            sharer,
            requester
        }
        if (val.trim()) {
            await actions.createPostInRoomTC({...oneNewMessage, text: val})
        }
        await actions.updateRoomTC(roomForUpdate)
        setVal('');
    }

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
                type={'text'}
                placeholder='Enter...'
                value={val}
                onChange={(e) => setVal(e.target.value)}
                mr={2}
            />
            <Button
                onClick={click}
                backgroundColor='#FF2D55'
                textTransform={"uppercase"}
                variant='solid'
                colorScheme='blue'
            >+
            </Button>
        </>
    )
})
