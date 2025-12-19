// Chat List - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import { Search, WhatsApp, FilterList, ExpandLess, Refresh, AddComment } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchMyChats, setSelectedChat, applyMessageUpdate } from '../../store/slices/chatsSlice';
import { socketService } from '../../services/socket.service';
import type { Chat, Campaign } from '../../types/index';
import CreateManualChatDialog from './CreateManualChatDialog';
import { formatRelativeDate, getClientPriority, getPriorityColor, truncate } from '../../utils/helpers';
import apiService from '../../services/api';

export default function ChatList() {
  const dispatch = useAppDispatch();
  const { items: chats, selectedChat, isLoading } = useAppSelector((state) => state.chats);
  
  // Estados de búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  // Estado para crear chat manual
  const [showCreateChatDialog, setShowCreateChatDialog] = useState(false);
  
  // Ref para el interval de polling
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Cargar chats inmediatamente
    dispatch(fetchMyChats({}));

    // Cargar campañas
    loadCampaigns();

    // Escuchar nuevos chats asignados
    const unsubscribeAssigned = socketService.onChatAssigned(() => {
      dispatch(fetchMyChats({})); // Recargar lista
    });

    // Escuchar nuevos mensajes
    const unsubscribeMessages = socketService.onMessageReceived((event) => {
      dispatch(applyMessageUpdate(event));
    });

    // Configurar polling como fallback (cada 30 segundos)
    // Esto asegura que los chats se actualicen incluso si el WebSocket falla
    pollingIntervalRef.current = setInterval(() => {
      dispatch(fetchMyChats({}));
    }, 30000); // 30 segundos

    return () => {
      unsubscribeAssigned();
      unsubscribeMessages();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [dispatch]);

  const loadCampaigns = async () => {
    try {
      const response = await apiService.get('/campaigns');
      setCampaigns(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error cargando campañas:', error);
    }
  };

  const handleRefresh = useCallback(() => {
    dispatch(fetchMyChats({}));
  }, [dispatch]);

  const handleSelectChat = (chat: Chat) => {
    dispatch(setSelectedChat(chat));
  };

  const handleChatCreated = (chat: Chat) => {
    // Recargar la lista de chats y seleccionar el nuevo
    dispatch(fetchMyChats({}));
    dispatch(setSelectedChat(chat));
  };

  // Filtrado de chats
  const filteredChats = useMemo(() => {
    let result = [...chats];

    // Filtrar por búsqueda (número, nombre)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((chat) => {
        const clientName = chat.client?.fullName || chat.client?.name || '';
        const phoneNumber = chat.externalId || chat.client?.phone || '';
        const documentNumber = chat.client?.documentNumber || '';
        return (
          clientName.toLowerCase().includes(query) ||
          phoneNumber.includes(query) ||
          documentNumber.includes(query)
        );
      });
    }

    // Filtrar por campaña
    if (selectedCampaign !== 'all') {
      result = result.filter((chat) => chat.campaign?.id === selectedCampaign);
    }

    // Filtrar por estado
    if (selectedStatus !== 'all') {
      result = result.filter((chat) => chat.status === selectedStatus);
    }

    return result;
  }, [chats, searchQuery, selectedCampaign, selectedStatus]);

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
      {/* Buscador y filtros */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nombre, número o cédula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Actualizar">
            <IconButton onClick={handleRefresh} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filtros">
            <IconButton onClick={() => setShowFilters(!showFilters)} size="small" color={showFilters ? 'primary' : 'default'}>
              {showFilters ? <ExpandLess /> : <FilterList />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Crear chat manual">
            <IconButton onClick={() => setShowCreateChatDialog(true)} size="small" color="primary">
              <AddComment />
            </IconButton>
          </Tooltip>
        </Box>

        <Collapse in={showFilters}>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <Select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                displayEmpty
              >
                <MenuItem value="all">Todas las campañas</MenuItem>
                {campaigns.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1 }}>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                displayEmpty
              >
                <MenuItem value="all">Todos los estados</MenuItem>
                <MenuItem value="waiting">En espera</MenuItem>
                <MenuItem value="active">Activo</MenuItem>
                <MenuItem value="resolved">Resuelto</MenuItem>
                <MenuItem value="closed">Cerrado</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Collapse>

        {/* Contador de resultados */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''}
            {searchQuery || selectedCampaign !== 'all' || selectedStatus !== 'all' ? ' (filtrados)' : ''}
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Lista de chats */}
      <List sx={{ flexGrow: 1, overflow: 'auto', py: 0 }}>
        {isLoading && chats.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Cargando chats...
          </Box>
        ) : filteredChats.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            {searchQuery || selectedCampaign !== 'all' || selectedStatus !== 'all' 
              ? 'No hay chats que coincidan con los filtros'
              : 'No tienes chats asignados'}
          </Box>
        ) : (
          filteredChats.map((chat) => {
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

      {/* Diálogo para crear chat manual */}
      <CreateManualChatDialog
        open={showCreateChatDialog}
        onClose={() => setShowCreateChatDialog(false)}
        onChatCreated={handleChatCreated}
      />
    </Box>
  );
}
