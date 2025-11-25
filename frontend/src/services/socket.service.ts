// Socket Service - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { io, Socket } from 'socket.io-client';
import type { 
  Message,
  MessageReceivedEvent, 
  AgentStatusChangedEvent,
  MessageStatus,
  MessageType,
} from '../types';
import { notificationService } from './notification.service';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Array<(data: any) => void>> = new Map();

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    // Conectar al namespace /events
    this.socket = io(`${SOCKET_URL}/events`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO conectado:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('❌ Socket.IO desconectado:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });

    // DEBUG: Listener global para TODOS los eventos
    this.socket.onAny((eventName: string, ...args: any[]) => {
      console.log(`📡 Evento recibido: ${eventName}`, args);
    });

    // Escuchar eventos personalizados
    this.socket.onAny((eventName, data) => {
      console.log(`🔔 Socket event: ${eventName}`, data);
      const handlers = this.eventHandlers.get(eventName);
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  // Métodos para emitir eventos
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Suscribirse a eventos
  on<T = any>(event: string, handler: (data: T) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    const handlers = this.eventHandlers.get(event)!;
    handlers.push(handler);

    // Retornar función para desuscribirse
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  // Métodos específicos para eventos del CRM
  onMessageReceived(handler: (data: MessageReceivedEvent) => void): () => void {
    return this.on<any>('message:new', (payload) => {
      const message = this.normalizeMessagePayload(payload);
      
      // Reproducir sonido si el mensaje es entrante (del cliente)
      if (message.direction === 'inbound' && message.senderType === 'client') {
        console.log('🔔 [Socket] Nuevo mensaje recibido - Reproduciendo notificación');
        notificationService.notifyNewMessage(
          payload.clientPhone || 'Cliente',
          message.content
        );
      }
      
      handler({
        chatId: message.chatId,
        message,
      });
    });
  }

  onAgentStatusChanged(handler: (data: AgentStatusChangedEvent) => void): () => void {
    return this.on<AgentStatusChangedEvent>('agent:state-changed', handler);
  }

  // Escuchar cuando se asigna un chat (usando el evento del gateway: 'chat:assigned')
  onChatAssigned(handler: (data: any) => void): () => void {
    console.log('🎧 Registrando listener para chat:assigned');
    return this.on<any>('chat:assigned', (data) => {
      // Reproducir sonido cuando se asigna un chat
      console.log('🔔 [Socket] Chat asignado - Reproduciendo notificación');
      notificationService.notifyChatAssigned(data.clientPhone || 'Cliente nuevo');
      handler(data);
    });
  }

  // Unirse a sala de agente
  joinAgentRoom(agentId: string): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket no conectado, no se puede unir a sala');
      return;
    }
    console.log(`🚪 Intentando unirse a sala del agente: ${agentId}`);
    this.socket.emit('agent:join', { agentId }, (response: any) => {
      console.log('✅ Respuesta de agent:join:', response);
    });
  }

  // Unirse a sala de chat específico
  joinChatRoom(chatId: string): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket no conectado, no se puede unir a sala de chat');
      return;
    }
    console.log(`🚪 Uniéndose a sala del chat: ${chatId}`);
    this.socket.emit('chat:subscribe', { chatId }, (response: any) => {
      console.log('✅ Respuesta de chat:subscribe:', response);
    });
  }

  // Salir de sala de chat
  leaveChatRoom(chatId: string): void {
    if (!this.socket?.connected) {
      return;
    }
    console.log(`🚪 Saliendo de sala del chat: ${chatId}`);
    this.socket.emit('chat:unsubscribe', { chatId });
  }

  // Unirse a sala de supervisor
  joinSupervisorRoom(): void {
    this.emit('supervisor:join');
  }

  // Cambiar estado del agente
  changeAgentState(state: 'available' | 'busy' | 'offline' | 'in-break'): void {
    this.emit('agent:state', { state });
  }

  // Indicador de escritura
  sendTypingIndicator(chatId: string, isTyping: boolean): void {
    this.emit('chat:typing', { chatId, isTyping });
  }

  private normalizeMessagePayload(payload: any): Message {
    if (!payload?.chatId) {
      console.warn('message:new recibido sin chatId', payload);
    }

    const timestamp = payload?.timestamp || new Date().toISOString();
    const messageId =
      payload?.messageId ||
      payload?.id ||
      `${payload?.chatId || 'message'}-${Date.now()}`;

    return {
      id: messageId,
      chatId: payload?.chatId,
      type: (payload?.type as MessageType) || 'text',
      direction: payload?.direction || 'inbound',
      senderType: payload?.senderType || 'client',
      status: (payload?.status as MessageStatus) || 'sent',
      content: payload?.content || '',
      mediaUrl: payload?.mediaUrl,
      metadata: payload?.metadata,
      createdAt: timestamp,
      sentAt: payload?.sentAt,
      deliveredAt: payload?.deliveredAt,
      readAt: payload?.readAt,
    };
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;
