// All Chats View - NGS&O CRM Gestión
// Vista de todos los chats para supervisores
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Avatar,
  LinearProgress,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Assignment,
  Close,
  Visibility,
  WhatsApp,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import apiService from '../services/api';
import { formatRelativeDate } from '../utils/helpers';

interface ChatWithAgent {
  id: string;
  contactName: string;
  contactPhone: string;
  status: string;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  unreadCount: number;
  priority?: string;
  assignedAgent: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  client: {
    id: string;
    fullName: string;
    debtAmount: number;
    daysOverdue: number;
  } | null;
}

interface Agent {
  id: string;
  fullName: string;
  email: string;
  currentChatsCount: number;
  maxConcurrentChats: number;
}

export default function AllChatsView() {
  const navigate = useNavigate();
  const [sidebarOpen] = useState(true);
  const [chats, setChats] = useState<ChatWithAgent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatWithAgent | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  // Leer query params de la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('chatId');
    const action = params.get('action');
    
    if (chatId) {
      // Esperar a que los chats se carguen
      if (chats.length > 0) {
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
          if (action === 'assign') {
            handleAssignClick(chat);
          } else {
            handleViewDetails(chat);
          }
          // Limpiar los query params de la URL
          window.history.replaceState({}, '', '/all-chats');
        }
      }
    }
  }, [chats]);

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Cargar todos los chats
      const chatsResponse = await apiService.get('/chats', {
        params: filterStatus !== 'all' ? { status: filterStatus } : {}
      });
      const chatsResult = chatsResponse.data || chatsResponse;
      const chatsData = chatsResult.data || chatsResult;
      setChats(Array.isArray(chatsData) ? chatsData : []);
      
      // Cargar lista de agentes
      const agentsResponse = await apiService.get('/users', {
        params: { isAgent: true }
      });
      const agentsResult = agentsResponse.data || agentsResponse;
      const agentsData = agentsResult.data || agentsResult;
      setAgents(Array.isArray(agentsData) ? agentsData : []);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (chat: ChatWithAgent) => {
    setSelectedChat(chat);
    setDetailsDialogOpen(true);
  };

  const handleAssignClick = (chat: ChatWithAgent) => {
    setSelectedChat(chat);
    setSelectedAgentId(chat.assignedAgent?.id || '');
    setAssignDialogOpen(true);
  };

  const handleAssignChat = async () => {
    if (!selectedChat || !selectedAgentId) {
      console.warn('⚠️ Intento de asignación sin chat o agente seleccionado');
      return;
    }
    
    console.log('🚀 Iniciando asignación de chat:', {
      chatId: selectedChat.id,
      agentId: selectedAgentId,
      chatContactName: selectedChat.contactName,
      chatContactPhone: selectedChat.contactPhone
    });
    
    try {
      const response = await apiService.patch(`/chats/${selectedChat.id}/assign`, {
        agentId: selectedAgentId
      });
      
      console.log('✅ Respuesta de asignación exitosa:', response);
      
      setSnackbar({
        open: true,
        message: `Chat asignado correctamente a ${agents.find(a => a.id === selectedAgentId)?.fullName || 'agente'}`,
        severity: 'success'
      });
      
      setAssignDialogOpen(false);
      setSelectedAgentId('');
      loadData();
    } catch (error: any) {
      console.error('❌ ERROR en asignación de chat:', {
        error,
        message: error?.message,
        response: error?.response,
        data: error?.response?.data,
        status: error?.response?.status
      });
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Error al asignar el chat';
      
      setSnackbar({
        open: true,
        message: `Error: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  const handleCloseChat = async (chatId: string) => {
    if (!confirm('¿Está seguro de cerrar este chat?')) return;
    
    try {
      await apiService.patch(`/chats/${chatId}/status`, {
        status: 'closed'
      });
      
      loadData();
    } catch (error) {
      console.error('Error cerrando chat:', error);
    }
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <ModernSidebar open={sidebarOpen} />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        
        <Box sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2d3748', mb: 1 }}>
                Todos los Chats
              </Typography>
              <Typography variant="body1" sx={{ color: '#718096' }}>
                Vista general de todos los chats del sistema
              </Typography>
            </Box>
        
        <TextField
          select
          size="small"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          sx={{ minWidth: 150 }}
          label="Filtrar por estado"
        >
          <MenuItem value="all">Todos</MenuItem>
          <MenuItem value="waiting">En espera</MenuItem>
          <MenuItem value="active">Activos</MenuItem>
          <MenuItem value="resolved">Resueltos</MenuItem>
          <MenuItem value="closed">Cerrados</MenuItem>
        </TextField>
      </Box>

          {/* Tabla de chats */}
          <Paper sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {isLoading ? (
              <LinearProgress sx={{ borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f7fafc' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#4a5568' }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#4a5568' }}>Contacto</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#4a5568' }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#4a5568' }}>Agente Asignado</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#4a5568' }}>Último Mensaje</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#4a5568' }}>Deuda</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: '#4a5568' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
              <TableBody>
                {chats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No hay chats para mostrar
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  chats.map((chat) => (
                    <TableRow key={chat.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            <WhatsApp fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {chat.contactName}
                            </Typography>
                            {chat.client && (
                              <Typography variant="caption" color="text.secondary">
                                {chat.client.fullName}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">{chat.contactPhone}</Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={getStatusLabel(chat.status)}
                          size="small"
                          color={getStatusColor(chat.status) as any}
                        />
                      </TableCell>
                      
                      <TableCell>
                        {chat.assignedAgent ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {chat.assignedAgent.fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {chat.assignedAgent.email}
                            </Typography>
                          </Box>
                        ) : (
                          <Chip label="Sin asignar" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {chat.lastMessageText || '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeDate(chat.lastMessageAt)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        {chat.client ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="error.main">
                              ${chat.client.debtAmount?.toLocaleString('es-CO')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {chat.client.daysOverdue} días mora
                            </Typography>
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Ver detalles">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewDetails(chat)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Asignar/Reasignar">
                            <IconButton 
                              size="small" 
                              onClick={() => handleAssignClick(chat)}
                              color="primary"
                            >
                              <Assignment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {chat.status !== 'closed' && (
                            <Tooltip title="Cerrar chat">
                              <IconButton 
                                size="small" 
                                onClick={() => handleCloseChat(chat.id)}
                                color="error"
                              >
                                <Close fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog de asignación */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Asignar Chat
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Chat: {selectedChat?.contactName}
            </Typography>
            
            <TextField
              select
              fullWidth
              label="Agente"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              sx={{ mt: 2 }}
            >
              <MenuItem value="">
                <em>Sin asignar</em>
              </MenuItem>
              {agents.map((agent) => (
                <MenuItem key={agent.id} value={agent.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Box>
                      <Typography variant="body2">{agent.fullName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {agent.email}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${agent.currentChatsCount}/${agent.maxConcurrentChats}`}
                      size="small"
                      color={agent.currentChatsCount >= agent.maxConcurrentChats ? 'error' : 'success'}
                    />
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} sx={{ color: '#718096' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAssignChat} 
            variant="contained"
            disabled={!selectedAgentId}
            sx={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #e55a2b 0%, #d94f23 100%)',
              },
            }}
          >
            Asignar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de detalles del chat */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalles del Chat
        </DialogTitle>
        <DialogContent>
          {selectedChat && (
            <Box sx={{ pt: 2 }}>
              {/* Información del cliente */}
              <Typography variant="h6" gutterBottom>
                Cliente
              </Typography>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body1" fontWeight={600}>
                  {selectedChat.contactName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  📱 {selectedChat.contactPhone}
                </Typography>
                {selectedChat.client && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Deuda Total
                        </Typography>
                        <Typography variant="body1" color="error" fontWeight={600}>
                          ${selectedChat.client.debtAmount.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Días en Mora
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedChat.client.daysOverdue} días
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </Box>

              {/* Información del chat */}
              <Typography variant="h6" gutterBottom>
                Estado del Chat
              </Typography>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  <Chip 
                    label={selectedChat.status} 
                    color={getStatusColor(selectedChat.status)} 
                    size="small" 
                  />
                  {selectedChat.priority && (
                    <Chip 
                      label={selectedChat.priority} 
                      color="error" 
                      size="small" 
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Último mensaje: {selectedChat.lastMessagePreview || 'Sin mensajes'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelativeDate(selectedChat.lastMessageAt)}
                </Typography>
              </Box>

              {/* Agente asignado */}
              <Typography variant="h6" gutterBottom>
                Agente Asignado
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                {selectedChat.assignedAgent ? (
                  <>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedChat.assignedAgent.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedChat.assignedAgent.email}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin agente asignado
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)} sx={{ color: '#718096' }}>
            Cerrar
          </Button>
          <Button 
            onClick={() => {
              setDetailsDialogOpen(false);
              navigate('/workspace');
            }}
            variant="contained"
            startIcon={<WhatsApp />}
            sx={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #e55a2b 0%, #d94f23 100%)',
              },
            }}
          >
            Abrir Chat
          </Button>
        </DialogActions>
      </Dialog>

          {/* Snackbar para notificaciones */}
          <Snackbar 
            open={snackbar.open} 
            autoHideDuration={6000} 
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert 
              onClose={() => setSnackbar({ ...snackbar, open: false })} 
              severity={snackbar.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </Box>
    </Box>
  );
}
