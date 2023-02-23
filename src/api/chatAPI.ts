import {supabase} from "@/supaBase.config";

import {InitialProductStateType} from "@/store/slices/productReducer";
import {AllValuesType} from "@/api/profileAPI";
import {PostgrestSingleResponse, RealtimeChannel} from "@supabase/supabase-js";

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
    last_message_seen_by: string
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
    id?:string
    requester: string
    sharer: string
    post_id: number
    last_message: string
    last_message_sent_by: string
    profiles?:AllValuesType
}

export const chatAPI = {
    listenChannel(payloadFunc: ((newMessage: RoomParticipantsType) => void)):RealtimeChannel{
        return supabase
            .channel("*")
            .on(
                "postgres_changes",
                {event: "INSERT", schema: "public", table: "room_participants"},
                (payload: { new: RoomParticipantsType; }) => {
                     const newMessage = payload.new
                     if (payloadFunc) {
                         payloadFunc(newMessage)
                     }
                 })
            .subscribe();
    },
    removeChannel(channel:RealtimeChannel): Promise<"error" | "ok" | "timed out">{
       return supabase.removeChannel(channel);
    },
    checkRoomAvailability(userID:string,postID:string):any{
        return supabase
            .from('rooms')
            .select('*')
            .match({requester: userID, post_id: postID});
    },
    createRoom(room:RoomType):PromiseLike<PostgrestSingleResponse<Array<RoomType>>>{
        return supabase.from("rooms").insert(room).select().single()
    },
    getRoom({sharerId,requesterId,postId}:PayloadForGEtRoom):any{
        return supabase
            .from("rooms") ///need to know roomID
            .select(`"*",profiles!rooms_requester_fkey("*")`)
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
            .select(`"*", posts("*"), room_participants("*"),profiles!rooms_sharer_fkey("*")`)
            .or(`sharer.eq.${userID}, requester.eq.${userID}`)
    },

}