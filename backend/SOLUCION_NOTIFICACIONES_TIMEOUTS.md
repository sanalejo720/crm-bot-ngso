# SOLUCIÓN 6: Sistema de Notificaciones y Timeouts

## ⏰ TimeoutMonitorWorker - Worker de Monitoreo de Tiempos

```typescript
// backend/src/modules/workers/timeout-monitor.worker.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';
import { ChatStateService } from '../chats/services/chat-state.service';
import { GatewayService } from '../gateway/gateway.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TimeoutMonitorWorker {
  private readonly logger = new Logger(TimeoutMonitorWorker.name);

  // Configuración de timeouts (en minutos)
  private readonly AGENT_WARNING_TIMEOUT = 5; // Advertencia a los 5 minutos
  private readonly AGENT_AUTO_CLOSE_TIMEOUT = 6; // Cierre automático a los 6 minutos
  private readonly CLIENT_WARNING_TIMEOUT = 5;
  private readonly CLIENT_AUTO_CLOSE_TIMEOUT = 6;

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    private chatStateService: ChatStateService,
    private gatewayService: GatewayService,
    private whatsappService: WhatsappService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 🔄 Ejecutar cada minuto para monitorear timeouts
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkTimeouts() {
    this.logger.log('⏰ [TIMEOUT-MONITOR] Iniciando verificación de timeouts...');

    try {
      // Monitorear timeouts de agentes
      await this.checkAgentTimeouts();

      // Monitorear timeouts de clientes
      await this.checkClientTimeouts();

      this.logger.log('✅ [TIMEOUT-MONITOR] Verificación completada');
    } catch (error) {
      this.logger.error(
        `❌ [TIMEOUT-MONITOR] Error en verificación: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 👨‍💼 Verificar timeouts de respuesta de agentes
   */
  private async checkAgentTimeouts() {
    const now = new Date();
    const warningThreshold = new Date(
      now.getTime() - this.AGENT_WARNING_TIMEOUT * 60000,
    );
    const closeThreshold = new Date(
      now.getTime() - this.AGENT_AUTO_CLOSE_TIMEOUT * 60000,
    );

    // Buscar chats donde el agente no ha respondido
    const chats = await this.chatRepository.find({
      where: {
        status: ChatStatus.AGENT_ASSIGNED,
        lastAgentMessageAt: LessThan(warningThreshold),
        agentWarningSent: false,
      },
      relations: ['assignedAgent', 'whatsappNumber'],
      take: 50, // Procesar en lotes
    });

    this.logger.log(
      `⚠️ [TIMEOUT-MONITOR] ${chats.length} chats con posible timeout de agente`,
    );

    for (const chat of chats) {
      try {
        const timeSinceLastMessage =
          (now.getTime() - chat.lastAgentMessageAt.getTime()) / 60000;

        // Si pasó el tiempo de cierre automático
        if (timeSinceLastMessage >= this.AGENT_AUTO_CLOSE_TIMEOUT) {
          await this.closeByAgentTimeout(chat);
        }
        // Si pasó el tiempo de advertencia
        else if (timeSinceLastMessage >= this.AGENT_WARNING_TIMEOUT) {
          await this.sendAgentWarning(chat);
        }
      } catch (error) {
        this.logger.error(
          `❌ [TIMEOUT-MONITOR] Error procesando chat ${chat.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * 👤 Verificar timeouts de respuesta de clientes
   */
  private async checkClientTimeouts() {
    const now = new Date();
    const warningThreshold = new Date(
      now.getTime() - this.CLIENT_WARNING_TIMEOUT * 60000,
    );
    const closeThreshold = new Date(
      now.getTime() - this.CLIENT_AUTO_CLOSE_TIMEOUT * 60000,
    );

    const chats = await this.chatRepository.find({
      where: {
        status: ChatStatus.AGENT_WAITING_CLIENT,
        lastClientMessageAt: LessThan(warningThreshold),
        clientWarningSent: false,
      },
      relations: ['assignedAgent', 'whatsappNumber'],
      take: 50,
    });

    this.logger.log(
      `⚠️ [TIMEOUT-MONITOR] ${chats.length} chats con posible timeout de cliente`,
    );

    for (const chat of chats) {
      try {
        const timeSinceLastMessage =
          (now.getTime() - chat.lastClientMessageAt.getTime()) / 60000;

        if (timeSinceLastMessage >= this.CLIENT_AUTO_CLOSE_TIMEOUT) {
          await this.closeByClientTimeout(chat);
        } else if (timeSinceLastMessage >= this.CLIENT_WARNING_TIMEOUT) {
          await this.sendClientWarning(chat);
        }
      } catch (error) {
        this.logger.error(
          `❌ [TIMEOUT-MONITOR] Error procesando chat ${chat.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * ⚠️ Enviar advertencia al agente
   */
  private async sendAgentWarning(chat: Chat) {
    this.logger.log(
      `⚠️ [TIMEOUT-MONITOR] Enviando advertencia de timeout a agente ${chat.assignedAgent.fullName} - Chat ${chat.id}`,
    );

    // Notificación WebSocket al agente
    this.gatewayService.notifyAgentTimeout(chat.assignedAgentId, {
      chatId: chat.id,
      clientName: chat.contactName,
      message: 'Has estado inactivo más de 5 minutos en este chat',
      autoCloseIn: 1, // Se cerrará en 1 minuto
    });

    // Reproducir sonido de alerta
    this.gatewayService.playSoundNotification(
      chat.assignedAgentId,
      'timeout-warning',
    );

    // Notificación de navegador
    this.gatewayService.sendBrowserNotification(chat.assignedAgentId, {
      title: '⚠️ Timeout de Inactividad',
      body: `Chat con ${chat.contactName} se cerrará en 1 minuto`,
      icon: '/warning-icon.png',
    });

    // Marcar advertencia enviada
    chat.agentWarningSent = true;
    await this.chatRepository.save(chat);

    // Emitir evento
    this.eventEmitter.emit('agent.timeout.warning', { chat });
  }

  /**
   * ⚠️ Enviar advertencia al cliente
   */
  private async sendClientWarning(chat: Chat) {
    this.logger.log(
      `⚠️ [TIMEOUT-MONITOR] Enviando advertencia de timeout a cliente - Chat ${chat.id}`,
    );

    const warningMessage = `⚠️ *¿Sigues ahí?*

Hemos notado que no has respondido en los últimos ${this.CLIENT_WARNING_TIMEOUT} minutos.

Si no recibimos respuesta en 1 minuto, cerraremos esta conversación automáticamente.

Para continuar, por favor responde este mensaje.`;

    await this.whatsappService.sendMessage(
      chat.whatsappNumber.sessionName,
      chat.contactPhone,
      warningMessage,
    );

    // Marcar advertencia enviada
    chat.clientWarningSent = true;
    await this.chatRepository.save(chat);

    // Notificar al agente
    this.gatewayService.notifyAgentClientTimeout(chat.assignedAgentId, {
      chatId: chat.id,
      clientName: chat.contactName,
      message: 'Cliente inactivo - advertencia enviada',
    });

    this.eventEmitter.emit('client.timeout.warning', { chat });
  }

  /**
   * ❌ Cerrar por timeout de agente
   */
  private async closeByAgentTimeout(chat: Chat) {
    this.logger.log(
      `❌ [TIMEOUT-MONITOR] Cerrando chat ${chat.id} por timeout de agente`,
    );

    // Transicionar a cerrado
    await this.chatStateService.transition(
      chat.id,
      ChatStatus.CLOSED,
      undefined,
      {
        reason: 'Cierre automático por inactividad del agente',
        triggeredBy: 'system',
        metadata: {
          timeoutType: 'agent',
          lastAgentMessageAt: chat.lastAgentMessageAt,
          minutesInactive: Math.floor(
            (Date.now() - chat.lastAgentMessageAt.getTime()) / 60000,
          ),
        },
      },
    );

    // Mensaje al cliente
    const farewellMessage = `✅ *Tu conversación ha sido cerrada*

Lamentamos no haber podido continuar con la atención en este momento.

Si deseas retomar la conversación, puedes escribirnos nuevamente y un asesor te atenderá.

*Equipo de Soporte NGSO* 📞`;

    await this.whatsappService.sendMessage(
      chat.whatsappNumber.sessionName,
      chat.contactPhone,
      farewellMessage,
    );

    // Notificar al agente
    this.gatewayService.notifyAgentChatClosed(chat.assignedAgentId, {
      chatId: chat.id,
      reason: 'timeout_agent',
    });

    // Decrementar contador del agente
    const agent = chat.assignedAgent;
    agent.currentChatsCount = Math.max(0, agent.currentChatsCount - 1);
    await this.chatRepository.manager.save(agent);

    // Emitir evento para generar PDF
    this.eventEmitter.emit('chat.closed', { chat });

    this.logger.log(`✅ [TIMEOUT-MONITOR] Chat ${chat.id} cerrado por timeout de agente`);
  }

  /**
   * ❌ Cerrar por timeout de cliente
   */
  private async closeByClientTimeout(chat: Chat) {
    this.logger.log(
      `❌ [TIMEOUT-MONITOR] Cerrando chat ${chat.id} por timeout de cliente`,
    );

    await this.chatStateService.transition(
      chat.id,
      ChatStatus.CLIENT_INACTIVE,
      undefined,
      {
        reason: 'Cierre automático por inactividad del cliente',
        triggeredBy: 'system',
        metadata: {
          timeoutType: 'client',
          lastClientMessageAt: chat.lastClientMessageAt,
          minutesInactive: Math.floor(
            (Date.now() - chat.lastClientMessageAt.getTime()) / 60000,
          ),
        },
      },
    );

    const farewellMessage = `✅ *Tu conversación ha sido cerrada*

No hemos recibido respuesta en el tiempo establecido.

Si deseas continuar, puedes escribirnos nuevamente y un asesor te atenderá.

*Equipo de Soporte NGSO* 📞`;

    await this.whatsappService.sendMessage(
      chat.whatsappNumber.sessionName,
      chat.contactPhone,
      farewellMessage,
    );

    this.gatewayService.notifyAgentChatClosed(chat.assignedAgentId, {
      chatId: chat.id,
      reason: 'timeout_client',
    });

    const agent = chat.assignedAgent;
    agent.currentChatsCount = Math.max(0, agent.currentChatsCount - 1);
    await this.chatRepository.manager.save(agent);

    this.eventEmitter.emit('chat.closed', { chat });

    this.logger.log(`✅ [TIMEOUT-MONITOR] Chat ${chat.id} cerrado por timeout de cliente`);
  }
}
```

## 🔔 GatewayService - Extensión para Notificaciones

```typescript
// backend/src/modules/gateway/gateway.service.ts (AGREGAR MÉTODOS)

@Injectable()
export class GatewayService {
  constructor(
    @InjectWebSocketServer()
    private server: Server,
  ) {}

  /**
   * ⚠️ Notificar timeout al agente
   */
  notifyAgentTimeout(
    agentId: string,
    data: {
      chatId: string;
      clientName: string;
      message: string;
      autoCloseIn: number;
    },
  ) {
    this.server.to(`agent-${agentId}`).emit('timeout.warning', {
      type: 'agent',
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * ⚠️ Notificar timeout de cliente al agente
   */
  notifyAgentClientTimeout(
    agentId: string,
    data: {
      chatId: string;
      clientName: string;
      message: string;
    },
  ) {
    this.server.to(`agent-${agentId}`).emit('client.timeout.warning', {
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * 🔊 Reproducir sonido de notificación
   */
  playSoundNotification(
    agentId: string,
    soundType: 'new-chat' | 'transfer' | 'timeout-warning' | 'urgent',
  ) {
    this.server.to(`agent-${agentId}`).emit('play.sound', {
      soundType,
      timestamp: new Date(),
    });
  }

  /**
   * 🔔 Enviar notificación de navegador
   */
  sendBrowserNotification(
    agentId: string,
    notification: {
      title: string;
      body: string;
      icon?: string;
    },
  ) {
    this.server.to(`agent-${agentId}`).emit('browser.notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  /**
   * ❌ Notificar cierre de chat
   */
  notifyAgentChatClosed(
    agentId: string,
    data: {
      chatId: string;
      reason: string;
    },
  ) {
    this.server.to(`agent-${agentId}`).emit('chat.closed', {
      ...data,
      timestamp: new Date(),
    });
  }
}
```

## 📱 Frontend - Hook de Notificaciones

```typescript
// frontend/src/hooks/useNotifications.ts

import { useEffect, useState } from 'react';
import { message, notification } from 'antd';
import { socket } from '../services/socket';
import { playSound } from '../utils/sounds';

export const useNotifications = (agentId: string) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] =
    useState(false);

  useEffect(() => {
    // Solicitar permiso de notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        setBrowserNotificationsEnabled(permission === 'granted');
      });
    } else {
      setBrowserNotificationsEnabled(Notification.permission === 'granted');
    }

    // Escuchar advertencias de timeout
    socket.on('timeout.warning', (data) => {
      notification.warning({
        message: '⚠️ Advertencia de Inactividad',
        description: `${data.message}. Se cerrará automáticamente en ${data.autoCloseIn} minuto(s).`,
        duration: 0, // No cerrar automáticamente
        key: `timeout-${data.chatId}`,
      });

      if (soundEnabled) {
        playSound('timeout-warning');
      }
    });

    // Escuchar timeouts de cliente
    socket.on('client.timeout.warning', (data) => {
      message.warning(
        `Cliente ${data.clientName} inactivo - Advertencia enviada`,
      );
    });

    // Escuchar reproducciones de sonido
    socket.on('play.sound', (data) => {
      if (soundEnabled) {
        playSound(data.soundType);
      }
    });

    // Escuchar notificaciones de navegador
    socket.on('browser.notification', (data) => {
      if (browserNotificationsEnabled) {
        new Notification(data.title, {
          body: data.body,
          icon: data.icon || '/logo.png',
          badge: '/badge.png',
        });
      }
    });

    return () => {
      socket.off('timeout.warning');
      socket.off('client.timeout.warning');
      socket.off('play.sound');
      socket.off('browser.notification');
    };
  }, [soundEnabled, browserNotificationsEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => !prev);
    message.success(
      soundEnabled
        ? 'Sonidos de notificación desactivados'
        : 'Sonidos de notificación activados',
    );
  };

  return {
    soundEnabled,
    browserNotificationsEnabled,
    toggleSound,
  };
};
```

## 🎵 Utilidad de Sonidos

```typescript
// frontend/src/utils/sounds.ts

const sounds = {
  'new-chat': '/sounds/new-chat.mp3',
  transfer: '/sounds/transfer.mp3',
  'timeout-warning': '/sounds/timeout-warning.mp3',
  urgent: '/sounds/urgent.mp3',
};

export const playSound = (soundType: keyof typeof sounds) => {
  try {
    const audio = new Audio(sounds[soundType]);
    audio.volume = 0.5;
    audio.play().catch((error) => {
      console.error('Error reproduciendo sonido:', error);
    });
  } catch (error) {
    console.error('Error al crear audio:', error);
  }
};
```
