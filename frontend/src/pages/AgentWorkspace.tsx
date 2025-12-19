// Agent Workspace - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchMyChats, setSelectedChat, updateChatDebtor } from '../store/slices/chatsSlice';
import { socketService } from '../services/socket.service';
import { useNotifications } from '../hooks/useNotifications';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import ChatList from '../components/chat/ChatList';
import ChatMessages from '../components/chat/ChatMessages';
import DebtorPanel from '../components/chat/DebtorPanel';
import WorkdayControls from '../components/workday/WorkdayControls';
import WorkdayStartupDialog from '../components/workday/WorkdayStartupDialog';
import api from '../services/api';

export default function AgentWorkspace() {
  const dispatch = useAppDispatch();
  const [sidebarOpen] = useState(true);
  const { user } = useAppSelector((state) => state.auth);
  const { selectedChat, items: myChats } = useAppSelector((state) => state.chats);
  const [showWorkdayDialog, setShowWorkdayDialog] = useState(false);
  const [checkingWorkday, setCheckingWorkday] = useState(true);

  // Verificar si tiene jornada activa al cargar
  const checkCurrentWorkday = useCallback(async () => {
    try {
      setCheckingWorkday(true);
      const response = await api.get('/workday/current');
      const workday = response.data?.data;
      
      // Si no hay jornada o no tiene clockInTime, mostrar dialog
      if (!workday || !workday.clockInTime) {
        setShowWorkdayDialog(true);
      }
    } catch (error: any) {
      // Si es 404 o no hay jornada, mostrar dialog
      if (error.response?.status === 404 || !error.response?.data?.data) {
        setShowWorkdayDialog(true);
      }
    } finally {
      setCheckingWorkday(false);
    }
  }, []);

  useEffect(() => {
    // Solo verificar jornada si el usuario es agente
    if (user?.isAgent) {
      checkCurrentWorkday();
    } else {
      setCheckingWorkday(false);
    }
  }, [user, checkCurrentWorkday]);

  const handleWorkdayStarted = () => {
    setShowWorkdayDialog(false);
    // Recargar chats después de iniciar jornada
    dispatch(fetchMyChats({}));
  };

  // ========== HOOK DE NOTIFICACIONES ==========
  useNotifications({
    onChatAssigned: (data) => {
      console.log('🔔 Chat asignado:', data);
      dispatch(fetchMyChats({}));
    },
    onChatTransferred: (data) => {
      console.log('🔔 Chat transferido:', data);
      dispatch(fetchMyChats({}));
    },
    onAgentTimeoutWarning: (data) => {
      console.log('⚠️ Warning de timeout:', data);
    },
    onChatClosed: (data) => {
      console.log('🚫 Chat cerrado:', data);
      dispatch(fetchMyChats({}));
    },
    onNewMessage: (data) => {
      console.log('💬 Nuevo mensaje:', data);
    },
    enableSounds: true,
    enableBrowserNotifications: true,
  });

  // Manejar chatId desde query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('chatId');
    
    if (chatId && myChats.length > 0) {
      const chat = myChats.find((c: any) => c.id === chatId);
      if (chat) {
        dispatch(setSelectedChat(chat));
        // Limpiar query params
        window.history.replaceState({}, '', '/workspace');
      }
    }
  }, [myChats, dispatch]);

  useEffect(() => {
    // Cargar chats del agente
    dispatch(fetchMyChats({}));

    let unsubscribeAssigned: (() => void) | undefined;
    let unsubscribeUnassigned: (() => void) | undefined;
    let unsubscribeDebtorLinked: (() => void) | undefined;

    // Configurar WebSocket
    if (user) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Registrar listener para chats asignados
        unsubscribeAssigned = socketService.onChatAssigned((data) => {
          console.log('📩 Nuevo chat asignado!', data);
          // Recargar la lista de chats inmediatamente
          dispatch(fetchMyChats({}));
        });

        // Registrar listener para chats desasignados (transferidos al bot)
        unsubscribeUnassigned = socketService.onChatUnassigned((data) => {
          console.log('🤖 Chat transferido al bot', data);
          // Recargar la lista de chats para remover el chat desasignado
          dispatch(fetchMyChats({}));
        });

        // Registrar listener para deudor vinculado al chat
        unsubscribeDebtorLinked = socketService.onDebtorLinked((data) => {
          console.log('👤 Deudor vinculado al chat:', data);
          // Actualizar el chat con la información del deudor
          dispatch(updateChatDebtor({ chatId: data.chatId, debtor: data.debtor }));
        });

        // Conectar si no está conectado
        if (!socketService.isConnected) {
          socketService.connect(token);
        }
        
        // Función para intentar unirse a la sala
        const tryJoinRoom = (attempts = 0) => {
          if (socketService.isConnected) {
            console.log('🔌 Socket conectado, uniéndose a sala...');
            socketService.joinAgentRoom(user.id);
          } else if (attempts < 10) {
            console.log(`⏳ Esperando conexión socket (intento ${attempts + 1}/10)...`);
            setTimeout(() => tryJoinRoom(attempts + 1), 500);
          } else {
            console.error('❌ No se pudo conectar al socket después de 10 intentos');
          }
        };
        
        tryJoinRoom();
      }
    }

    return () => {
      // Limpiar listeners al desmontar
      if (unsubscribeAssigned) {
        unsubscribeAssigned();
      }
      if (unsubscribeUnassigned) {
        unsubscribeUnassigned();
      }
      if (unsubscribeDebtorLinked) {
        unsubscribeDebtorLinked();
      }
    };
  }, [dispatch, user]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      {/* Dialog de inicio de jornada obligatorio */}
      <WorkdayStartupDialog 
        open={showWorkdayDialog && !checkingWorkday} 
        onWorkdayStarted={handleWorkdayStarted} 
      />

      <ModernSidebar open={sidebarOpen} />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <AppHeader />

        {/* Workspace principal */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '300px 1fr 300px' },
          overflow: 'hidden',
          height: 'calc(100vh - 64px)'
        }}>
        {/* Lista de chats (izquierda) */}
        <Box sx={{ height: '100%', borderRight: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <ChatList />
        </Box>

        {/* Área de conversación (centro) */}
        <Box sx={{ height: '100%', overflow: 'hidden' }}>
          {selectedChat ? (
            <ChatMessages chat={selectedChat} />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              Selecciona un chat para comenzar
            </Box>
          )}
        </Box>

        {/* Panel de deudor y controles (derecha) */}
        <Box sx={{ height: '100%', borderLeft: 1, borderColor: 'divider', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
          {/* Control de jornada laboral */}
          <WorkdayControls />
          
          {/* Panel de deudor */}
          {selectedChat && (selectedChat.debtor || selectedChat.client) ? (
            <DebtorPanel client={(selectedChat.debtor || selectedChat.client) ?? null} chat={selectedChat} />
          ) : (
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                p: 2,
                textAlign: 'center',
              }}
            >
              {selectedChat ? 'Este chat no tiene deudor asociado' : 'La información del deudor aparecerá aquí'}
            </Box>
          )}
        </Box>
        </Box>
      </Box>
    </Box>
  );
}
