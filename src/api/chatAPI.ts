import {supabase} from "@/supaBase.config";

import {InitialProductStateType} from "@/store/slices/productReducer";
import {AllValuesType} from "@/api/profileAPI";

export type PayloadForGEtRoom={
    sharerId:string
    requesterId:string
    postId:string
}
export type RoomParticipantsType = {
    id: string
    image: string | null
    profile_id: string | null
    room_id: string
    text: string | null
    timestamp: string
}
export type CustomRoomType = {
    id: string
    last_message: string
    last_message_seen_by: null
    last_message_sent_by: string
    last_message_time: string
    post_id: number
    posts: InitialProductStateType
    profiles:AllValuesType
    requester: string
    room_participants: Array<RoomParticipantsType>
    sharer: string
}
export type RoomType = {
    requester: string
    sharer: string
    post_id: number
    last_message: string
    last_message_sent_by: string
}

export const chatAPI = {
    checkRoomAvailability(userID:string,postID:string):any{
        return supabase
            .from('rooms')
            .select('*')
            .match({requester: userID, post_id: postID});
    },
    createRoom(room:RoomType){
        return supabase.from("rooms").insert(room).select()
    },
    getRoom({sharerId,requesterId,postId}:PayloadForGEtRoom):any{
        return supabase
            .from("rooms") ///need to know roomID
            .select()
            .match({
                sharer: sharerId,
                requester: requesterId,
                post_id: postId
            })
    },
    getAllMessagesInRoomParticipantsFromOneRoom(roomId:string):any {
        return  supabase
            .from("room_participants") ///need to know roomID
            .select()
            .eq('room_id',roomId)
            .order('timestamp', {ascending: true})
    },
    getAllRoomsForCurrentUser(userID:string):any {
        return supabase  ///get all rooms for current user to show all his conversations
            .from("rooms")
            .select(`"*", posts("*"), room_participants("*"), profiles!rooms_requester_fkey("*")`)
            .or(`sharer.eq.${userID}, requester.eq.${userID}`)

    },

}