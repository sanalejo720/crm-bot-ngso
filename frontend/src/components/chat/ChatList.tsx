// Chat List - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Badge,
  Chip,
  Divider,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search, WhatsApp } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchMyChats, setSelectedChat, applyMessageUpdate } from '../../store/slices/chatsSlice';
import { socketService } from '../../services/socket.service';
import type { Chat } from '../../types/index';
import { formatRelativeDate, getClientPriority, getPriorityColor, truncate } from '../../utils/helpers';

export default function ChatList() {
  const dispatch = useAppDispatch();
  const { items: chats, selectedChat, isLoading } = useAppSelector((state) => state.chats);

  useEffect(() => {
    // Cargar chats
    dispatch(fetchMyChats({}));

    // Escuchar nuevos chats asignados
    const unsubscribeAssigned = socketService.onChatAssigned(() => {
      dispatch(fetchMyChats({})); // Recargar lista
    });

    // Escuchar nuevos mensajes
    const unsubscribeMessages = socketService.onMessageReceived((event) => {
      dispatch(applyMessageUpdate(event));
    });

    return () => {
      unsubscribeAssigned();
      unsubscribeMessages();
    };
  }, [dispatch]);

  const handleSelectChat = (chat: Chat) => {
    dispatch(setSelectedChat(chat));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'active': return 'success';
      case 'resolved': return 'info';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting': return 'En espera';
      case 'active': return 'Activo';
      case 'resolved': return 'Resuelto';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Buscador */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar chats..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Divider />

      {/* Lista de chats */}
      <List sx={{ flexGrow: 1, overflow: 'auto', py: 0 }}>
        {isLoading && chats.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Cargando chats...
          </Box>
        ) : chats.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            No tienes chats asignados
          </Box>
        ) : (
          chats.map((chat) => {
            // Si no hay cliente, usar datos del contacto
            const priority = chat.client ? getClientPriority(chat.client) : 'MEDIA';
            const priorityColor = getPriorityColor(priority);
            const displayName = chat.client 
              ? (chat.client.fullName || chat.client.name)
              : (chat.externalId || 'Sin contacto');
            
            return (
              <Box key={chat.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    selected={selectedChat?.id === chat.id}
                    onClick={() => handleSelectChat(chat)}
                    sx={{
                      borderLeft: 4,
                      borderColor: priorityColor,
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={chat.unreadCount} color="error">
                        <Avatar sx={{ bgcolor: priorityColor }}>
                          <WhatsApp />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" component="span" sx={{ flexGrow: 1 }}>
                            {displayName}
                          </Typography>
                          <Chip
                            label={priority}
                            size="small"
                            sx={{
                              backgroundColor: priorityColor,
                              color: 'white',
                              height: 20,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box sx={{ display: 'block' }}>
                          <Box
                            sx={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              color: 'text.secondary',
                            }}
                          >
                            {chat.lastMessage?.content
                              ? truncate(chat.lastMessage.content, 40)
                              : 'Sin mensajes'}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={getStatusLabel(chat.status)}
                              size="small"
                              color={getStatusColor(chat.status)}
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                            <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                              {chat.lastMessage?.createdAt
                                ? formatRelativeDate(chat.lastMessage.createdAt)
                                : formatRelativeDate(chat.startedAt)}
                            </Box>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                <Divider />
              </Box>
            );
          })
        )}
      </List>
    </Box>
  );
}
