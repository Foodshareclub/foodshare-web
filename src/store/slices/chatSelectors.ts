import {StateAppType} from "@/store/redux-store";


export const roomSelector = (state: StateAppType) => state.chat.room[0];
export const requesterSelector = (state: StateAppType) => state.chat.room[0]?.profiles?.avatar_url;
export const allRoomsSelector = (state: StateAppType) => state.chat.allRooms;
export const messagesFromOneRoomSelector = (state: StateAppType) => state.chat.messagesFromOneRoom;
export const statusSelector = (state: StateAppType) => state.chat.status;
export const createdSelector = (state: StateAppType) => state.chat.isCreated;
export const newMessageSelector = (state: StateAppType) => state.chat.newMessage;
export const newMessageRoomIdSelector = (state: StateAppType) => state.chat.newMessage.room_id;
