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
import { Chat } from '../chats/entities/chat.entity';
import { Message } from '../messages/entities/message.entity';
import { User, AgentState } from '../users/entities/user.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: User;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(private jwtService: JwtService) {}

  /**
   * Manejar nueva conexión
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extraer token del handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Cliente sin token rechazado: ${client.id}`);
        client.disconnect();
        return;
      }

      // Validar JWT
      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;
      client.user = payload;

      // Registrar conexión
      this.connectedUsers.set(payload.sub, client.id);

      // Unir a sala personal
      client.join(`user:${payload.sub}`);

      // Si es agente, unir a sala de agentes
      if (payload.role?.name === 'Agente' || payload.role?.name === 'Supervisor') {
        client.join('agents');
      }

      // Si es supervisor, unir a sala de supervisores
      if (payload.role?.name === 'Supervisor' || payload.role?.name === 'Super Admin') {
        client.join('supervisors');
      }

      this.logger.log(`Cliente conectado: ${payload.email} (${client.id})`);

      // Notificar conexión
      this.server.to('supervisors').emit('agent:online', {
        userId: payload.sub,
        userName: payload.fullName,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error en autenticación WebSocket: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Manejar desconexión
   */
  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);

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
  handleMessageCreated(message: Message) {
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
    if (message.chat?.assignedAgentId) {
      this.server.to(`user:${message.chat.assignedAgentId}`).emit('message:new', {
        messageId: message.id,
        chatId: message.chatId,
        content: message.content,
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
}
