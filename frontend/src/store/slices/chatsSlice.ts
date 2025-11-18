// Chats Slice - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Chat, ChatStatus, Message } from '../../types/index';
import apiService from '../../services/api';

interface ChatFilters {
  status?: ChatStatus;
  priority?: string;
  search?: string;
}

interface ChatsState {
  items: Chat[];
  selectedChat: Chat | null;
  total: number;
  isLoading: boolean;
  error: string | null;
  filters: ChatFilters;
}

const initialState: ChatsState = {
  items: [],
  selectedChat: null,
  total: 0,
  isLoading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchMyChats = createAsyncThunk(
  'chats/fetchMyChats',
  async (filters: ChatFilters = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/chats/my-chats', { params: filters });
      const result = response.data || response;
      // Backend devuelve { success, data, timestamp }
      return result.data || result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error obteniendo chats');
    }
  }
);

export const fetchChatById = createAsyncThunk(
  'chats/fetchChatById',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/chats/${chatId}`);
      const result = response.data || response;
      return result.data || result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error obteniendo chat');
    }
  }
);

export const assignChatToMe = createAsyncThunk(
  'chats/assignChatToMe',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.patch(`/chats/${chatId}/assign-to-me`);
      const result = response.data || response;
      return result.data || result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error asignando chat');
    }
  }
);

export const updateChatStatus = createAsyncThunk(
  'chats/updateChatStatus',
  async ({ chatId, status }: { chatId: string; status: ChatStatus }, { rejectWithValue }) => {
    try {
      const response = await apiService.patch(`/chats/${chatId}/status`, { status });
      const result = response.data || response;
      return result.data || result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error actualizando estado');
    }
  }
);

const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    setSelectedChat: (state, action: PayloadAction<Chat | null>) => {
      state.selectedChat = action.payload;
    },
    addChat: (state, action: PayloadAction<Chat>) => {
      // Agregar al inicio si no existe
      if (!state.items.find(c => c.id === action.payload.id)) {
        state.items.unshift(action.payload);
        state.total += 1;
      }
    },
    updateChat: (state, action: PayloadAction<Chat>) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      
      // Si es el chat seleccionado, actualizar también
      if (state.selectedChat?.id === action.payload.id) {
        state.selectedChat = action.payload;
      }
    },
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const chat = state.items.find(c => c.id === action.payload);
      if (chat) {
        chat.unreadCount += 1;
      }
    },
    applyMessageUpdate: (state, action: PayloadAction<{ chatId: string; message: Message }>) => {
      const chat = state.items.find(c => c.id === action.payload.chatId);
      if (chat) {
        chat.lastMessage = action.payload.message;

        const isInbound = action.payload.message.direction === 'inbound';
        const isNotOpen = state.selectedChat?.id !== chat.id;

        if (isInbound && isNotOpen) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }
      }
    },
    resetUnreadCount: (state, action: PayloadAction<string>) => {
      const chat = state.items.find(c => c.id === action.payload);
      if (chat) {
        chat.unreadCount = 0;
      }
    },
    setFilters: (state, action: PayloadAction<ChatsState['filters']>) => {
      state.filters = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch my chats
    builder.addCase(fetchMyChats.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchMyChats.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = Array.isArray(action.payload) ? action.payload : [];
      state.total = Array.isArray(action.payload) ? action.payload.length : 0;
    });
    builder.addCase(fetchMyChats.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch chat by ID
    builder.addCase(fetchChatById.fulfilled, (state, action) => {
      state.selectedChat = action.payload;
    });

    // Assign chat to me
    builder.addCase(assignChatToMe.fulfilled, (state, action) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedChat?.id === action.payload.id) {
        state.selectedChat = action.payload;
      }
    });

    // Update chat status
    builder.addCase(updateChatStatus.fulfilled, (state, action) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedChat?.id === action.payload.id) {
        state.selectedChat = action.payload;
      }
    });
  },
});

export const {
  setSelectedChat,
  addChat,
  updateChat,
  incrementUnreadCount,
   applyMessageUpdate,
  resetUnreadCount,
  setFilters,
  clearError,
} = chatsSlice.actions;

export default chatsSlice.reducer;
