import React, {KeyboardEvent, memo, useState} from "react";
import {useActionCreators, useAppSelector} from "@/hook";
import {Button, Input} from "@chakra-ui/react";
import {createPostInRoomTC, updateRoomTC} from "@/store/slices/chatReducer";


type InputSectionType = {
    roomId: string
    userID:string
}
export const InputSection: React.FC<InputSectionType> = memo(({roomId,userID}) => {

    const actions = useActionCreators({createPostInRoomTC, updateRoomTC})
    const [val, setVal] = useState('');


    const sendMessage = async () => {
        const oneNewMessage = {room_id:roomId, profile_id: userID};
        const roomForUpdate = {
            id: oneNewMessage.room_id,
            last_message: val,
            last_message_sent_by: userID,
            last_message_seen_by: userID,
        }
        if (val.trim()) {
            await actions.createPostInRoomTC({...oneNewMessage, text: val})
        }
        await actions.updateRoomTC(roomForUpdate)
        setVal('');
    }

    const keyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            sendMessage()
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
                onClick={sendMessage}
                backgroundColor='#FF2D55'
                textTransform={"uppercase"}
                variant='solid'
                colorScheme='blue'
            >+
            </Button>
        </>
    )
})
