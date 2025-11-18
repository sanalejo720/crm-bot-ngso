// Chat Messages - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Send, SmartToy, Person } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchMessages, sendMessage, addMessage } from '../../store/slices/messagesSlice';
import { socketService } from '../../services/socket.service';
import type { Chat, Message } from '../../types/index';
import { formatTimeOnly, getInitials } from '../../utils/helpers';

interface ChatMessagesProps {
  chat: Chat;
}

export default function ChatMessages({ chat }: ChatMessagesProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { items: messagesMap, isSending } = useAppSelector((state) => state.messages);
  const messages = messagesMap[chat.id] || [];
  
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cargar mensajes del chat
    dispatch(fetchMessages(chat.id));

    // Escuchar nuevos mensajes
    const unsubscribe = socketService.onMessageReceived((event) => {
      if (event.chatId === chat.id) {
        dispatch(addMessage(event.message));
      }
    });

    return () => unsubscribe();
  }, [chat.id, dispatch]);

  useEffect(() => {
    // Auto-scroll al último mensaje
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    
    if (messageText.trim() === '' || isSending) return;

    const text = messageText;
    setMessageText('');
    
    await dispatch(sendMessage({ chatId: chat.id, content: text }));
    scrollToBottom();
  };

  const getSenderIcon = (message: Message) => {
    switch (message.senderType) {
      case 'client':
        return <Person />;
      case 'bot':
        return <SmartToy />;
      case 'agent':
        return user ? (
          <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
            {getInitials(`${user.firstName} ${user.lastName}`)}
          </Avatar>
        ) : (
          <Person />
        );
      default:
        return <Person />;
    }
  };

  const isMyMessage = (message: Message) => {
    return message.direction === 'outbound' && message.senderType === 'agent';
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header del chat */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">{chat.client.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {chat.client.phone}
        </Typography>
      </Paper>

      {/* Área de mensajes */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          backgroundColor: '#f5f5f5',
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <CircularProgress size={24} sx={{ mr: 2 }} />
            Cargando mensajes...
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: isMyMessage(message) ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              {/* Avatar para mensajes entrantes */}
              {!isMyMessage(message) && (
                <Box sx={{ mr: 1 }}>
                  {getSenderIcon(message)}
                </Box>
              )}

              {/* Burbuja de mensaje */}
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  backgroundColor: isMyMessage(message) ? '#dcf8c6' : 'white',
                  borderRadius: 2,
                  borderTopRightRadius: isMyMessage(message) ? 0 : 2,
                  borderTopLeftRadius: isMyMessage(message) ? 2 : 0,
                }}
              >
                {/* Indicador de bot */}
                {message.senderType === 'bot' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <SmartToy sx={{ fontSize: 14, mr: 0.5, color: 'primary.main' }} />
                    <Typography variant="caption" color="primary">
                      Bot Automático
                    </Typography>
                  </Box>
                )}

                <Typography variant="body1">{message.content}</Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimeOnly(message.createdAt)}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input de mensaje */}
      <Paper
        component="form"
        onSubmit={handleSendMessage}
        elevation={3}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 0,
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Escribe un mensaje..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          disabled={isSending || chat.status === 'closed'}
          sx={{ mr: 1 }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={messageText.trim() === '' || isSending || chat.status === 'closed'}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '&.Mui-disabled': {
              backgroundColor: 'action.disabledBackground',
            },
          }}
        >
          {isSending ? <CircularProgress size={24} /> : <Send />}
        </IconButton>
      </Paper>
    </Box>
  );
}
