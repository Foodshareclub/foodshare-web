import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {chatAPI, CustomRoomType, PayloadForGEtRoom, RoomParticipantsType, RoomType} from "@/api/chatAPI";


const initialState = {
    room: [] as Array<RoomType>,
    createdRoom: [] as Array<RoomType>,
    allRooms: [] as Array<CustomRoomType>,
    messagesFromOneRoom: [] as Array<RoomParticipantsType>,
    status: "loading",
    isCreated: "creation"
};

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
        } else if (!data.length) {
            res = "notCreated"
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
        }
        if (!data.length) {
            res = "notCreated"
        }else {
            res = "created"
        }
        //console.log(data)
        return {res,data};
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
        return data;
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
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(createRoomTC.pending, (state) => {
            state.isCreated = "creation"
        });
        builder.addCase(createRoomTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.isCreated = action.payload.res;
                state.createdRoom = action.payload.data;
            }
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
                state.createdRoom=action.payload.data;
            }
        });
        builder.addCase(getAllRoomsForCurrentUserTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.allRooms = action.payload
            }
        });
        builder.addCase(getAllMessagesInRoomParticipantsFromOneRoomTC.fulfilled, (state, action) => {
            if (action.payload) {
                state.messagesFromOneRoom = action.payload
            }
        });
    }
})


export const {reducer: chatReducer, actions: chatActions} = chatSlice;