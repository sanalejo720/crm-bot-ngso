// Redux Store - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatsReducer from './slices/chatsSlice';
import messagesReducer from './slices/messagesSlice';
import clientsReducer from './slices/clientsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chats: chatsReducer,
    messages: messagesReducer,
    clients: clientsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignorar estas rutas para fechas y objetos complejos
        ignoredActions: ['chats/setChats', 'messages/addMessage'],
        ignoredPaths: ['chats.items', 'messages.items'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
