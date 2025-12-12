import { useEffect, useRef } from 'react';
import { notification } from 'antd';
import {
  WarningOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';

interface UseNotificationsOptions {
  onAgentTimeoutWarning?: (data: any) => void;
  onClientTimeoutWarning?: (data: any) => void;
  onChatClosed?: (data: any) => void;
  onChatAutoClosed?: (data: any) => void;
  onNewMessage?: (data: any) => void;
  onChatAssigned?: (data: any) => void;
  onChatTransferred?: (data: any) => void;
  enableSounds?: boolean;
  enableBrowserNotifications?: boolean;
}

// Sonidos del sistema - Usando el único archivo disponible
const notificationSound = new Audio('/sounds/notification.mp3');
notificationSound.load();

const sounds = {
  warning: notificationSound,
  notification: notificationSound,
  success: notificationSound,
  error: notificationSound,
  alert: notificationSound,
};

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const {
    onAgentTimeoutWarning,
    onClientTimeoutWarning,
    onChatClosed,
    onChatAutoClosed,
    onNewMessage,
    onChatAssigned,
    onChatTransferred,
    enableSounds = true,
    enableBrowserNotifications = true,
  } = options;

  // Reproducir sonido
  const playSound = (type: keyof typeof sounds) => {
    if (enableSounds && sounds[type]) {
      sounds[type].currentTime = 0;
      sounds[type].play().catch((e) => console.warn('Error playing sound:', e));
    }
  };

  // Mostrar notificación del navegador
  const showBrowserNotification = (title: string, options?: NotificationOptions) => {
    if (!enableBrowserNotifications) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  };

  // Solicitar permiso para notificaciones del navegador
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  useEffect(() => {
    // Solicitar permiso de notificaciones al montar
    requestNotificationPermission();

    const token = localStorage.getItem('token');
    if (!token) return;

    // Conectar a WebSocket
    const socket = io(`${import.meta.env.VITE_API_URL}/events`, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // Conexión establecida
    socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
    });

    // Error de conexión
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
    });

    // ==================== EVENTOS DE TIMEOUTS ====================

    // Warning de timeout del agente
    socket.on('chat:agent:timeout:warning', (data) => {
      console.log('⚠️ Warning de timeout de agente:', data);

      notification.warning({
        title: '⚠️ Cliente esperando respuesta',
        description: data.message || `El cliente del chat #${data.chatId} está esperando tu respuesta`,
        icon: <WarningOutlined style={{ color: '#faad14' }} />,
        duration: 10,
        placement: 'topRight',
      });

      playSound('warning');
      showBrowserNotification('⚠️ Cliente esperando respuesta', {
        body: data.message,
        icon: '/logo.png',
        tag: `agent-timeout-${data.chatId}`,
        requireInteraction: true,
      });

      onAgentTimeoutWarning?.(data);
    });

    // Warning de timeout del cliente
    socket.on('chat:client:timeout:warning', (data) => {
      console.log('⏰ Warning de timeout de cliente:', data);

      notification.info({
        title: '⏰ Cliente inactivo',
        description: data.message || `El cliente del chat #${data.chatId} no responde`,
        icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
        duration: 8,
        placement: 'topRight',
      });

      playSound('notification');
      onClientTimeoutWarning?.(data);
    });

    // Chat cerrado por timeout del agente
    socket.on('chat:closed:agent:timeout', (data) => {
      console.log('🚫 Chat cerrado por timeout de agente:', data);

      notification.error({
        title: '🚫 Chat cerrado por timeout',
        description: data.message || `El chat #${data.chatId} fue cerrado por no responder a tiempo`,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        duration: 0, // No auto cerrar
        placement: 'topRight',
      });

      playSound('alert');
      showBrowserNotification('🚫 Chat cerrado por timeout', {
        body: data.message,
        icon: '/logo.png',
        tag: `chat-closed-${data.chatId}`,
      });

      onChatClosed?.(data);
    });

    // Chat cerrado por timeout del cliente
    socket.on('chat:closed:client:timeout', (data) => {
      console.log('✅ Chat cerrado por inactividad del cliente:', data);

      notification.success({
        title: '✅ Chat cerrado automáticamente',
        description: data.message || `El chat #${data.chatId} fue cerrado por inactividad del cliente`,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        duration: 5,
        placement: 'bottomRight',
      });

      playSound('success');
      onChatClosed?.(data);
    });

    // Chat cerrado automáticamente (24h)
    socket.on('chat:auto:closed', (data) => {
      console.log('🔒 Chat cerrado automáticamente:', data);

      notification.info({
        title: '🔒 Chat cerrado por inactividad',
        description: data.message || `El chat #${data.chatId} fue cerrado automáticamente`,
        duration: 5,
        placement: 'bottomRight',
      });

      playSound('notification');
      onChatAutoClosed?.(data);
    });

    // ==================== EVENTOS GENERALES ====================

    // Reproducir sonido
    socket.on('sound:play', (data) => {
      playSound(data.type);
    });

    // Notificación del navegador
    socket.on('browser:notification', (data) => {
      showBrowserNotification(data.title, data.options);
    });

    // Nuevo mensaje
    socket.on('message:new', (data) => {
      onNewMessage?.(data);
    });

    // Chat asignado
    socket.on('chat:assigned', (data) => {
      onChatAssigned?.(data);
    });

    // Chat transferido
    socket.on('chat:transferred', (data) => {
      onChatTransferred?.(data);
    });

    // Actualización de cola de espera
    socket.on('queue:waiting:update', (data) => {
      console.log('📋 Cola de espera actualizada:', data);
    });

    // Limpieza
    return () => {
      socket.disconnect();
    };
  }, [
    onAgentTimeoutWarning,
    onClientTimeoutWarning,
    onChatClosed,
    onChatAutoClosed,
    onNewMessage,
    onChatAssigned,
    onChatTransferred,
    enableSounds,
    enableBrowserNotifications,
  ]);

  return {
    socket: socketRef.current,
    playSound,
    requestNotificationPermission,
  };
};
