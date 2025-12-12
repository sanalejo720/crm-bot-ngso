import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../chats/entities/chat.entity';
import { Message } from '../messages/entities/message.entity';
import { User, AgentState } from '../users/entities/user.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: User;
}

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5174', // Puerto alternativo de Vite
    ],
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Manejar nueva conexión
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extraer token del handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`❌ Cliente sin token rechazado: ${client.id}`);
        client.disconnect();
        return;
      }

      this.logger.log(`🔍 Validando token para cliente: ${client.id}`);

      // Validar JWT
      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;
      client.user = payload;

      // Registrar conexión
      this.connectedUsers.set(payload.sub, client.id);

      // Unir a sala personal
      client.join(`user:${payload.sub}`);

      // Si es agente, unir a sala de agentes y actualizar estado a AVAILABLE
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (user?.isAgent) {
        client.join('agents');
        
        // Actualizar estado a AVAILABLE si estaba OFFLINE
        if (user.agentState === AgentState.OFFLINE) {
          await this.userRepository.update(payload.sub, {
            agentState: AgentState.AVAILABLE,
            lastActivityAt: new Date(),
          });
          this.logger.log(`✅ Agente ${payload.email} puesto en estado AVAILABLE (WebSocket)`);
        }
      }

      // Si es supervisor, unir a sala de supervisores
      if (payload.role?.name === 'Supervisor' || payload.role?.name === 'Super Admin' || payload.role?.name === 'Administrador') {
        client.join('supervisors');
      }

      this.logger.log(`✅ Cliente conectado exitosamente: ${payload.email} (${client.id})`);

      // Notificar conexión
      this.server.to('supervisors').emit('agent:online', {
        userId: payload.sub,
        userName: payload.fullName,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`❌ Error en autenticación WebSocket (${client.id}): ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Manejar desconexión
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);

      // Si era agente, ponerlo OFFLINE
      const user = await this.userRepository.findOne({ where: { id: client.userId } });
      if (user?.isAgent) {
        await this.userRepository.update(client.userId, {
          agentState: AgentState.OFFLINE,
          lastActivityAt: new Date(),
        });
        this.logger.log(`✅ Agente ${client.userId} puesto en estado OFFLINE (desconexión WebSocket)`);
      }

      this.logger.log(`Cliente desconectado: ${client.userId} (${client.id})`);

      // Notificar desconexión
      this.server.to('supervisors').emit('agent:offline', {
        userId: client.userId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Suscribirse a actualizaciones de un chat
   */
  @SubscribeMessage('chat:subscribe')
  handleSubscribeChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    client.join(`chat:${data.chatId}`);
    this.logger.log(`Usuario ${client.userId} suscrito a chat ${data.chatId}`);
    return { success: true };
  }

  /**
   * Desuscribirse de actualizaciones de un chat
   */
  @SubscribeMessage('chat:unsubscribe')
  handleUnsubscribeChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    client.leave(`chat:${data.chatId}`);
    this.logger.log(`Usuario ${client.userId} desuscrito de chat ${data.chatId}`);
    return { success: true };
  }

  /**
   * Agente se une a su sala personal
   */
  @SubscribeMessage('agent:join')
  handleAgentJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { agentId: string },
  ) {
    const roomName = `user:${data.agentId}`;
    client.join(roomName);
    this.logger.log(`✅ Agente ${data.agentId} unido a sala ${roomName} (Socket: ${client.id})`);
    return { success: true, room: roomName };
  }

  /**
   * Agente está escribiendo
   */
  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ) {
    this.server.to(`chat:${data.chatId}`).emit('chat:typing', {
      chatId: data.chatId,
      userId: client.userId,
      userName: client.user?.fullName,
      isTyping: data.isTyping,
      timestamp: new Date(),
    });
  }

  /**
   * Cambiar estado del agente
   */
  @SubscribeMessage('agent:state')
  handleAgentStateChange(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { state: AgentState },
  ) {
    // Emitir a supervisores
    this.server.to('supervisors').emit('agent:state-changed', {
      userId: client.userId,
      userName: client.user?.fullName,
      state: data.state,
      timestamp: new Date(),
    });

    return { success: true };
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Evento: Nuevo chat creado
   */
  @OnEvent('chat.created')
  handleChatCreated(chat: Chat) {
    this.logger.log(`Evento chat.created: ${chat.id}`);

    // Notificar a agentes disponibles
    this.server.to('agents').emit('chat:new', {
      chatId: chat.id,
      campaignId: chat.campaignId,
      contactPhone: chat.contactPhone,
      contactName: chat.contactName,
      lastMessage: chat.lastMessage,
      timestamp: new Date(),
    });

    // Notificar a supervisores
    this.server.to('supervisors').emit('chat:created', {
      chatId: chat.id,
      campaignId: chat.campaignId,
      status: chat.status,
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Chat asignado a agente
   */
  @OnEvent('chat.assigned')
  handleChatAssigned(data: { chat: Chat; agentId: string; agentName: string }) {
    this.logger.log(`📨 Evento chat.assigned recibido: Chat ${data.chat.id} -> Agente ${data.agentName} (${data.agentId})`);

    const roomName = `user:${data.agentId}`;
    const socketId = this.connectedUsers.get(data.agentId);
    
    this.logger.log(`🎯 Emitiendo a sala: ${roomName} (Socket: ${socketId || 'no conectado'})`);

    // Notificar al agente asignado
    this.server.to(roomName).emit('chat:assigned', {
      chatId: data.chat.id,
      campaignId: data.chat.campaignId,
      contactPhone: data.chat.contactPhone,
      contactName: data.chat.contactName,
      lastMessage: data.chat.lastMessage,
      timestamp: new Date(),
    });

    // Notificar a supervisores
    this.server.to('supervisors').emit('chat:assignment', {
      chatId: data.chat.id,
      agentId: data.agentId,
      agentName: data.agentName,
      timestamp: new Date(),
    });

    this.logger.log(`✅ Evento chat:assigned emitido correctamente`);
  }

  /**
   * Evento: Chat transferido
   */
  @OnEvent('chat.transferred')
  handleChatTransferred(data: {
    chat: Chat;
    fromAgentId: string;
    toAgentId: string;
    fromAgentName: string;
    toAgentName: string;
  }) {
    this.logger.log(`Evento chat.transferred: ${data.chat.id} -> ${data.toAgentName}`);

    // Notificar al agente anterior
    this.server.to(`user:${data.fromAgentId}`).emit('chat:transferred-out', {
      chatId: data.chat.id,
      toAgentName: data.toAgentName,
      timestamp: new Date(),
    });

    // Notificar al nuevo agente
    this.server.to(`user:${data.toAgentId}`).emit('chat:transferred-in', {
      chatId: data.chat.id,
      campaignId: data.chat.campaignId,
      contactPhone: data.chat.contactPhone,
      contactName: data.chat.contactName,
      fromAgentName: data.fromAgentName,
      timestamp: new Date(),
    });

    // Notificar a supervisores
    this.server.to('supervisors').emit('chat:transfer', {
      chatId: data.chat.id,
      fromAgentId: data.fromAgentId,
      toAgentId: data.toAgentId,
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Chat desasignado (transferido al bot)
   */
  @OnEvent('chat.unassigned')
  handleChatUnassigned(data: {
    chat: Chat;
    previousAgentId: string;
    reason: string;
  }) {
    this.logger.log(`Evento chat.unassigned: ${data.chat.id} desasignado del agente ${data.previousAgentId}`);

    // Notificar al agente que el chat fue desasignado
    this.server.to(`user:${data.previousAgentId}`).emit('chat:unassigned', {
      chatId: data.chat.id,
      reason: data.reason,
      timestamp: new Date(),
    });

    // Notificar a supervisores
    this.server.to('supervisors').emit('chat:unassigned', {
      chatId: data.chat.id,
      previousAgentId: data.previousAgentId,
      reason: data.reason,
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Chat cerrado
   */
  @OnEvent('chat.closed')
  handleChatClosed(chat: Chat) {
    this.logger.log(`Evento chat.closed: ${chat.id}`);

    // Notificar a todos en el chat
    this.server.to(`chat:${chat.id}`).emit('chat:closed', {
      chatId: chat.id,
      status: chat.status,
      timestamp: new Date(),
    });

    // Notificar al agente si está asignado
    if (chat.assignedAgentId) {
      this.server.to(`user:${chat.assignedAgentId}`).emit('chat:closed', {
        chatId: chat.id,
        timestamp: new Date(),
      });
    }

    // Notificar a supervisores
    this.server.to('supervisors').emit('chat:status-changed', {
      chatId: chat.id,
      status: chat.status,
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Nuevo mensaje
   */
  @OnEvent('message.created')
  handleMessageCreated(event: { message: Message; chat: any }) {
    const { message, chat } = event;
    this.logger.log(`Evento message.created: ${message.id} en chat ${message.chatId}`);

    // Notificar a todos en el chat
    this.server.to(`chat:${message.chatId}`).emit('message:new', {
      messageId: message.id,
      chatId: message.chatId,
      type: message.type,
      direction: message.direction,
      senderType: message.senderType,
      content: message.content,
      mediaUrl: message.mediaUrl,
      status: message.status,
      timestamp: message.createdAt,
    });

    // Si el chat está asignado, notificar al agente
    if (chat?.assignedAgentId) {
      this.server.to(`user:${chat.assignedAgentId}`).emit('message:new', {
        messageId: message.id,
        chatId: message.chatId,
        type: message.type,
        direction: message.direction,
        senderType: message.senderType,
        content: message.content,
        mediaUrl: message.mediaUrl,
        status: message.status,
        timestamp: message.createdAt,
      });
    }
  }

  /**
   * Evento: Estado de mensaje actualizado
   */
  @OnEvent('message.status-updated')
  handleMessageStatusUpdated(data: { messageId: string; chatId: string; status: string }) {
    this.logger.log(`Evento message.status-updated: ${data.messageId} -> ${data.status}`);

    // Notificar a todos en el chat
    this.server.to(`chat:${data.chatId}`).emit('message:status', {
      messageId: data.messageId,
      status: data.status,
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Estado del agente actualizado
   */
  @OnEvent('user.agent-state-changed')
  handleAgentStateChanged(data: { userId: string; userName: string; state: AgentState }) {
    this.logger.log(`Evento user.agent-state-changed: ${data.userName} -> ${data.state}`);

    // Notificar a supervisores
    this.server.to('supervisors').emit('agent:state-changed', {
      userId: data.userId,
      userName: data.userName,
      state: data.state,
      timestamp: new Date(),
    });
  }

  /**
   * Evento: QR Code de WhatsApp generado
   */
  @OnEvent('whatsapp.qrcode.generated')
  handleWhatsAppQRGenerated(data: { numberId: string; qrCode: string; sessionName?: string }) {
    this.logger.log(`Evento whatsapp.qrcode.generated: ${data.numberId || data.sessionName}`);

    // Notificar a todos los supervisores y admins
    this.server.emit('whatsapp.qrcode.generated', {
      numberId: data.numberId,
      sessionName: data.sessionName,
      qrCode: data.qrCode,
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Estado de sesión WhatsApp actualizado
   */
  @OnEvent('whatsapp.session.status')
  handleWhatsAppSessionStatus(data: { sessionName: string; status: string }) {
    this.logger.log(`Evento whatsapp.session.status: ${data.sessionName} -> ${data.status}`);

    // Notificar cambio de estado
    this.server.emit('whatsapp.session.status', {
      sessionName: data.sessionName,
      status: data.status,
      timestamp: new Date(),
    });

    // Si está conectado, emitir evento específico
    if (data.status === 'isLogged' || data.status === 'qrReadSuccess') {
      this.server.emit('whatsapp.session.connected', {
        sessionName: data.sessionName,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Evento: Sesión WhatsApp desconectada
   */
  @OnEvent('whatsapp.session.disconnected')
  handleWhatsAppSessionDisconnected(data: { numberId: string }) {
    this.logger.log(`Evento whatsapp.session.disconnected: ${data.numberId}`);

    this.server.emit('whatsapp.session.disconnected', {
      numberId: data.numberId,
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Mensaje de WhatsApp recibido
   */
  @OnEvent('whatsapp.message.received')
  handleWhatsAppMessageReceived(data: any) {
    this.logger.log(`Evento whatsapp.message.received: ${data.from}`);

    // Este evento será procesado por el sistema de chats
    // Aquí solo notificamos que llegó un mensaje de WhatsApp
    this.server.to('agents').emit('whatsapp.message.incoming', {
      from: data.from,
      content: data.content,
      timestamp: data.timestamp,
    });
  }

  /**
   * Evento: Warning de timeout del agente (5 minutos)
   */
  @OnEvent('chat.agent.timeout.warning')
  handleAgentTimeoutWarning(data: { chatId: number; agentId: number; minutesSinceLastMessage: number }) {
    this.logger.log(`⚠️ Warning de timeout de agente: Chat ${data.chatId}, Agente ${data.agentId}`);

    // Notificar al agente específico
    this.server.to(`user:${data.agentId}`).emit('chat:agent:timeout:warning', {
      chatId: data.chatId,
      minutesSinceLastMessage: data.minutesSinceLastMessage,
      message: `⚠️ El cliente está esperando tu respuesta hace ${data.minutesSinceLastMessage} minutos`,
      timestamp: new Date(),
      sound: 'warning',
      priority: 'high',
    });

    // Notificar a supervisores
    this.server.to('supervisors').emit('chat:agent:timeout:warning', {
      chatId: data.chatId,
      agentId: data.agentId,
      minutesSinceLastMessage: data.minutesSinceLastMessage,
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Warning de timeout del cliente (5 minutos)
   */
  @OnEvent('chat.client.timeout.warning')
  handleClientTimeoutWarning(data: { chatId: number; agentId: number; minutesSinceLastMessage: number }) {
    this.logger.log(`⚠️ Warning de timeout de cliente: Chat ${data.chatId}`);

    // Notificar al agente específico
    this.server.to(`user:${data.agentId}`).emit('chat:client:timeout:warning', {
      chatId: data.chatId,
      minutesSinceLastMessage: data.minutesSinceLastMessage,
      message: `⏰ El cliente no responde hace ${data.minutesSinceLastMessage} minutos. El chat se cerrará pronto.`,
      timestamp: new Date(),
      sound: 'notification',
      priority: 'medium',
    });
  }

  /**
   * Evento: Chat cerrado por timeout del agente
   */
  @OnEvent('chat.closed.agent.timeout')
  handleChatClosedByAgentTimeout(data: { chatId: number; agentId: number }) {
    this.logger.log(`🚫 Chat ${data.chatId} cerrado por timeout de agente ${data.agentId}`);

    // Notificar al agente
    this.server.to(`user:${data.agentId}`).emit('chat:closed:agent:timeout', {
      chatId: data.chatId,
      message: '🚫 Chat cerrado automáticamente por no responder a tiempo',
      timestamp: new Date(),
      sound: 'alert',
      priority: 'critical',
    });

    // Notificar a supervisores
    this.server.to('supervisors').emit('chat:closed:agent:timeout', {
      chatId: data.chatId,
      agentId: data.agentId,
      timestamp: new Date(),
    });

    // Notificar a la sala del chat
    this.server.to(`chat:${data.chatId}`).emit('chat:closed', {
      chatId: data.chatId,
      reason: 'agent_timeout',
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Chat cerrado por timeout del cliente
   */
  @OnEvent('chat.closed.client.timeout')
  handleChatClosedByClientTimeout(data: { chatId: number; agentId: number }) {
    this.logger.log(`🚫 Chat ${data.chatId} cerrado por inactividad del cliente`);

    // Notificar al agente
    this.server.to(`user:${data.agentId}`).emit('chat:closed:client:timeout', {
      chatId: data.chatId,
      message: '✅ Chat cerrado automáticamente por inactividad del cliente',
      timestamp: new Date(),
      sound: 'success',
      priority: 'low',
    });

    // Notificar a supervisores
    this.server.to('supervisors').emit('chat:closed:client:timeout', {
      chatId: data.chatId,
      agentId: data.agentId,
      timestamp: new Date(),
    });

    // Notificar a la sala del chat
    this.server.to(`chat:${data.chatId}`).emit('chat:closed', {
      chatId: data.chatId,
      reason: 'client_timeout',
      timestamp: new Date(),
    });
  }

  /**
   * Evento: Chat cerrado automáticamente (24h inactividad)
   */
  @OnEvent('chat.auto.closed')
  handleChatAutoClosed(data: { chatId: number; agentId?: number; inactiveHours: number; lastActivity: Date }) {
    this.logger.log(`🔒 Chat ${data.chatId} cerrado automáticamente por ${data.inactiveHours}h de inactividad`);

    // Si había agente asignado, notificarle
    if (data.agentId) {
      this.server.to(`user:${data.agentId}`).emit('chat:auto:closed', {
        chatId: data.chatId,
        inactiveHours: data.inactiveHours,
        lastActivity: data.lastActivity,
        message: `🔒 Chat cerrado automáticamente por ${data.inactiveHours} horas de inactividad`,
        timestamp: new Date(),
        sound: 'notification',
        priority: 'low',
      });
    }

    // Notificar a supervisores
    this.server.to('supervisors').emit('chat:auto:closed', {
      chatId: data.chatId,
      agentId: data.agentId,
      inactiveHours: data.inactiveHours,
      lastActivity: data.lastActivity,
      timestamp: new Date(),
    });

    // Notificar a la sala del chat
    this.server.to(`chat:${data.chatId}`).emit('chat:closed', {
      chatId: data.chatId,
      reason: 'auto_close',
      inactiveHours: data.inactiveHours,
      timestamp: new Date(),
    });
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Emitir evento personalizado a un usuario
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emitir evento personalizado a un chat
   */
  emitToChat(chatId: string, event: string, data: any) {
    this.server.to(`chat:${chatId}`).emit(event, data);
  }

  /**
   * Emitir evento a todos los agentes
   */
  emitToAgents(event: string, data: any) {
    this.server.to('agents').emit(event, data);
  }

  /**
   * Emitir evento a todos los supervisores
   */
  emitToSupervisors(event: string, data: any) {
    this.server.to('supervisors').emit(event, data);
  }

  /**
   * Verificar si un usuario está conectado
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Obtener usuarios conectados
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Notificar timeout de agente con sonido y notificación del navegador
   */
  notifyAgentTimeout(agentId: number, chatId: number, minutesSinceLastMessage: number) {
    this.logger.log(`🔔 Notificando timeout de agente: ${agentId} - Chat ${chatId}`);

    this.server.to(`user:${agentId}`).emit('notification:agent:timeout', {
      type: 'agent_timeout',
      chatId,
      minutesSinceLastMessage,
      title: '⚠️ Cliente esperando respuesta',
      message: `El cliente del chat #${chatId} está esperando hace ${minutesSinceLastMessage} minutos`,
      sound: 'warning',
      vibrate: [200, 100, 200],
      priority: 'high',
      timestamp: new Date(),
      actions: [
        { action: 'view', title: 'Ver chat' },
        { action: 'dismiss', title: 'Ignorar' },
      ],
    });
  }

  /**
   * Notificar timeout de cliente con sonido
   */
  notifyClientTimeout(agentId: number, chatId: number, minutesSinceLastMessage: number) {
    this.logger.log(`🔔 Notificando timeout de cliente: Chat ${chatId}`);

    this.server.to(`user:${agentId}`).emit('notification:client:timeout', {
      type: 'client_timeout',
      chatId,
      minutesSinceLastMessage,
      title: '⏰ Cliente inactivo',
      message: `El cliente del chat #${chatId} no responde hace ${minutesSinceLastMessage} minutos`,
      sound: 'notification',
      priority: 'medium',
      timestamp: new Date(),
    });
  }

  /**
   * Reproducir sonido de notificación
   */
  playSoundNotification(userId: string, soundType: 'success' | 'warning' | 'error' | 'notification' | 'alert') {
    this.server.to(`user:${userId}`).emit('sound:play', {
      type: soundType,
      timestamp: new Date(),
    });
  }

  /**
   * Enviar notificación del navegador (Browser Notification API)
   */
  sendBrowserNotification(
    userId: string,
    title: string,
    options: {
      body?: string;
      icon?: string;
      badge?: string;
      sound?: string;
      vibrate?: number[];
      tag?: string;
      requireInteraction?: boolean;
    },
  ) {
    this.server.to(`user:${userId}`).emit('browser:notification', {
      title,
      options,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar a agente que su chat será cerrado pronto
   */
  notifyUpcomingAutoClose(agentId: number, chatId: number, hoursRemaining: number) {
    this.logger.log(`📅 Notificando auto-cierre próximo: Chat ${chatId} - ${hoursRemaining}h restantes`);

    this.server.to(`user:${agentId}`).emit('notification:upcoming:close', {
      type: 'upcoming_close',
      chatId,
      hoursRemaining,
      title: '📅 Chat próximo a cerrarse',
      message: `El chat #${chatId} se cerrará automáticamente en ${hoursRemaining} horas por inactividad`,
      sound: 'notification',
      priority: 'low',
      timestamp: new Date(),
    });
  }

  /**
   * Notificar cierre de chat al agente
   */
  notifyAgentChatClosed(agentId: number, chatId: number, reason: string, message: string) {
    this.logger.log(`🚫 Notificando cierre de chat: ${chatId} - Razón: ${reason}`);

    const soundMap = {
      agent_timeout: 'alert',
      client_timeout: 'success',
      auto_close: 'notification',
      manual: 'success',
    };

    const priorityMap = {
      agent_timeout: 'critical',
      client_timeout: 'low',
      auto_close: 'low',
      manual: 'medium',
    };

    this.server.to(`user:${agentId}`).emit('notification:chat:closed', {
      type: 'chat_closed',
      chatId,
      reason,
      message,
      sound: soundMap[reason] || 'notification',
      priority: priorityMap[reason] || 'medium',
      timestamp: new Date(),
    });
  }

  /**
   * Notificar a supervisores sobre métricas de timeouts
   */
  notifySupervisorsTimeoutStats(stats: {
    agentTimeouts: number;
    clientTimeouts: number;
    autoClosures: number;
    period: string;
  }) {
    this.logger.log(`📊 Enviando estadísticas de timeouts a supervisores`);

    this.server.to('supervisors').emit('stats:timeouts', {
      ...stats,
      timestamp: new Date(),
    });
  }

  /**
   * Notificar nuevo chat en cola de espera
   */
  notifyWaitingQueueUpdate(queueCount: number, chatId?: number) {
    this.logger.log(`📋 Actualizando cola de espera: ${queueCount} chats`);

    this.server.to('supervisors').emit('queue:waiting:update', {
      queueCount,
      chatId,
      timestamp: new Date(),
    });

    // Si hay nuevo chat, reproducir sonido a supervisores
    if (chatId) {
      this.server.to('supervisors').emit('sound:play', {
        type: 'notification',
        reason: 'new_waiting_chat',
        chatId,
      });
    }
  }
}
