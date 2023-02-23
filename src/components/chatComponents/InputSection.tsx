import React, {KeyboardEvent, memo, useState} from "react";
import {useAppSelector} from "@/hook";
import {supabase} from "@/supaBase.config";
import {Button, Input} from "@chakra-ui/react";
import {AddIcon} from "@chakra-ui/icons";
import {RoomParticipantsType} from "@/api/chatAPI";


type InputSectionType = {
    messages: Array<RoomParticipantsType>
    requester: string
    sharer: string
    postID: string
}
export const InputSection: React.FC<InputSectionType> = memo(({messages, sharer, requester, postID}) => {
    const userID = useAppSelector(state => state.user.session?.user.id);
    const [val, setVal] = useState('');

    const click = async () => {
        const oneMessage = {room_id: messages[0].room_id, profile_id: userID};

        if (val.trim()) {
            await supabase.from("room_participants").insert({...oneMessage, text: val});
        }
        await supabase
            .from("rooms")
            .update({
                id: oneMessage.room_id,
                last_message: val,
                last_message_sent_by:userID,
                last_message_seen_by:userID,
                post_id: Number(postID),
                sharer,
                requester
            })
            .eq('id', oneMessage.room_id); ///update last_message in rooms
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
                borderRadius={20}
                type={'text'}
                placeholder='Enter...'
                value={val}
                onChange={(e) => setVal(e.target.value)}
                mr={2}
            />
            <Button
                onClick={click}
                as={AddIcon}
                borderRadius={20}
                colorScheme={"green"}
                p={2}
                backgroundColor='#FF2D55'
                color={"white"}
                variant={"solid"}>
            </Button>
        </>
    )
})
