import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {chatAPI, CustomRoomType, PayloadForGEtRoom, RoomParticipantsType, RoomType} from "@/api/chatAPI";
import {RealtimeChannel} from "@supabase/supabase-js";


const initialState = {
    channel: {} as RealtimeChannel,
    newMessage: {} as RoomParticipantsType,
    room: [] as Array<RoomType>,
    createdRoom: [] as Array<RoomType>,
    allRooms: [] as Array<CustomRoomType>,
    messagesFromOneRoom: [] as Array<RoomParticipantsType>,
    status: "loading",
    isCreated: "creation",
    updateRoomStatus: "loading"
};
export const updateRoomTC = createAsyncThunk("/updateRoomTC", async (room: RoomType, thunkAPI) => {
    let res;
    try {
        const {data, error} = await chatAPI.updateRoom(room)
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }
        res = "updated"
        console.log("updateRoomTC")
        return {res, data};
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});
export const createPostInRoomTC = createAsyncThunk("/creatPostInRoomTC", async (message: RoomParticipantsType, thunkAPI) => {
    try {
        const {data, error} = await chatAPI.creatPostInRoom(message)
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }
        console.log("creatPostInRoomTC")
        return data;
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});
export const listenChannelTC = createAsyncThunk("/listenChannel", async (_, thunkAPI) => {
    const messageHandler = (message: RoomParticipantsType) => {
        thunkAPI.dispatch(chatActions.addNewMessage(message))
    }
    try {
        return await chatAPI.listenChannel(messageHandler)
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});
export const createRoomTC = createAsyncThunk("/createRoomTC", async (payload: RoomType, thunkAPI) => {
    let res;
    try {
        let {data, error} = await chatAPI.createRoom(payload)
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }
        if (data === null) {
            res = "notCreated"
            return {res, data: []};
        } else {
            res = "created"
        }
        return {res, data};
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});
export const checkRoomAvailabilityTC = createAsyncThunk("/checkRoomAvailabilityTC", async (arg: { userID: string, postID: string }, thunkAPI) => {
    let res;
    try {
        let {data, error} = await chatAPI.checkRoomAvailability(arg.userID, arg.postID)
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        } else if (data?.length) {
            console.log(data)
            res = "created"
            return {res, data};
        } else if (data === null) {
            res = "notCreated"
            return {res, data: []};
        }
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});
export const getRoomTC = createAsyncThunk("/getRoomTC", async (payload: PayloadForGEtRoom, thunkAPI) => {
    try {
        let {data, error} = await chatAPI.getRoom(payload)
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }
        return data;
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});
export const getAllMessagesInRoomParticipantsFromOneRoomTC = createAsyncThunk("/getAllMessagesInRoomParticipantsFromOneRoomTC", async (roomId: string, thunkAPI) => {
    try {
        let {data, error} = await chatAPI.getAllMessagesInRoomParticipantsFromOneRoom(roomId)
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }
        if (data)
            return data.reverse();
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});
export const getAllRoomsForCurrentUserTC = createAsyncThunk("/getAllRoomsForCurrentUser", async (userId: string, thunkAPI) => {
    try {
        let {data, error} = await chatAPI.getAllRoomsForCurrentUser(userId)
        if (error) {
            console.log(error);
            return thunkAPI.rejectWithValue(error);
        }
        return data;
    } catch (e) {
        return thunkAPI.rejectWithValue(e);
    }
});


const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        addNewMessage: (state, action) => {
            state.newMessage = action.payload;
        },
        clearRoom:(state)=>{
            state.room = [] as Array<RoomType>;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(createPostInRoomTC.fulfilled, (state, action) => {

        });
        builder.addCase(updateRoomTC.pending, (state) => {
            state.updateRoomStatus = "loading"
        });
        builder.addCase(updateRoomTC.fulfilled, (state, action) => {
            state.updateRoomStatus = action.payload.res;

        });
        builder.addCase(createRoomTC.pending, (state) => {
            state.isCreated = "creation"
        });
        builder.addCase(createRoomTC.fulfilled, (state, action) => {
            state.isCreated = action.payload.res;
            state.createdRoom = action.payload.data;

        });
        builder.addCase(listenChannelTC.fulfilled, (state, action) => {
            state.channel = action.payload;
        });
        builder.addCase(getRoomTC.pending, (state) => {
            state.status = "loading";
        });
        builder.addCase(getRoomTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.room = action.payload
                state.status = "loaded";
            }
        });
        builder.addCase(checkRoomAvailabilityTC.pending, (state) => {
            state.isCreated = "creation"
        });
        builder.addCase(checkRoomAvailabilityTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.isCreated = action.payload.res;
                state.createdRoom = action.payload.data;
            }
        });
        builder.addCase(getAllRoomsForCurrentUserTC.fulfilled, (state, action) => {
            state.allRooms = action.payload
        });
        builder.addCase(getAllMessagesInRoomParticipantsFromOneRoomTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.messagesFromOneRoom = action.payload
            }
        });
    }
})


export const {reducer: chatReducer, actions: chatActions} = chatSlice;