// Messages Slice - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Message } from '../../types/index';
import apiService from '../../services/api';

interface MessagesState {
  items: Record<string, Message[]>; // chatId -> messages[]
  isLoading: boolean;
  error: string | null;
  isSending: boolean;
}

const initialState: MessagesState = {
  items: {},
  isLoading: false,
  error: null,
  isSending: false,
};

// Async thunks
export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get(
        `/messages/chat/${chatId}`
        // Sin límite para cargar todo el historial
      );
      const result = response.data || response;
      const messages = result.data || result;
      return { chatId, messages: Array.isArray(messages) ? messages : [] };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error obteniendo mensajes');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (
    { chatId, content }: { chatId: string; content: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.post('/messages/send', {
        chatId,
        content,
      });
      const result = response.data || response;
      return result.data || result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error enviando mensaje');
    }
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      const chatId = action.payload.chatId;
      if (!state.items[chatId]) {
        state.items[chatId] = [];
      }
      
      // Evitar duplicados
      if (!state.items[chatId].find(m => m.id === action.payload.id)) {
        state.items[chatId].push(action.payload);
        
        // Ordenar por fecha
        state.items[chatId].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    },
    updateMessage: (state, action: PayloadAction<Message>) => {
      const chatId = action.payload.chatId;
      if (state.items[chatId]) {
        const index = state.items[chatId].findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.items[chatId][index] = action.payload;
        }
      }
    },
    clearMessagesForChat: (state, action: PayloadAction<string>) => {
      delete state.items[action.payload];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch messages
    builder.addCase(fetchMessages.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items[action.payload.chatId] = action.payload.messages;
    });
    builder.addCase(fetchMessages.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Send message
    builder.addCase(sendMessage.pending, (state) => {
      state.isSending = true;
      state.error = null;
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.isSending = false;
      
      // Agregar mensaje enviado
      const chatId = action.payload.chatId;
      if (!state.items[chatId]) {
        state.items[chatId] = [];
      }
      state.items[chatId].push(action.payload);
    });
    builder.addCase(sendMessage.rejected, (state, action) => {
      state.isSending = false;
      state.error = action.payload as string;
    });
  },
});

export const {
  addMessage,
  updateMessage,
  clearMessagesForChat,
  clearError,
} = messagesSlice.actions;

export default messagesSlice.reducer;
