import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { BackendMessage } from '../services/api';

interface MessageState {
    messages: BackendMessage[];
    unreadCount: number;
    loading: boolean;
}

const initialState: MessageState = {
    messages: [],
    unreadCount: 0,
    loading: false,
};

export const fetchUnreadMessages = createAsyncThunk<BackendMessage[]>(
    'messages/fetchUnread',
    async () => {
        try {
            const res = await api.get<BackendMessage[]>('/api/messages/getunread');
            if (res.status === 204 || !res.data) return [];
            return Array.isArray(res.data) ? res.data : [];
        } catch {
            return [];
        }
    }
);

export const markMessageRead = createAsyncThunk<number, number>(
    'messages/markRead',
    async (id) => {
        try {
            await api.get(`/api/messages/markasread/${id}`);
        } catch {
            // Swallow — still remove from local list
        }
        return id;
    }
);

const messageSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchUnreadMessages.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchUnreadMessages.fulfilled, (state, action) => {
                state.loading = false;
                state.messages = action.payload;
                state.unreadCount = action.payload.length;
            })
            .addCase(fetchUnreadMessages.rejected, (state) => {
                state.loading = false;
            })
            .addCase(markMessageRead.fulfilled, (state, action) => {
                state.messages = state.messages.filter(m => m.id !== action.payload);
                state.unreadCount = state.messages.length;
            });
    },
});

export default messageSlice.reducer;