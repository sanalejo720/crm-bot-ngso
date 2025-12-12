# SOLUCIÓN 5: Reasignación Sin Cerrar Conversación

## 🔄 TransferService - Servicio de Transferencia de Chats

```typescript
// backend/src/modules/chats/services/transfer.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Chat, ChatStatus } from '../entities/chat.entity';
import { User } from '../../users/entities/user.entity';
import { ChatStateService } from './chat-state.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { GatewayService } from '../../gateway/gateway.service';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatStateService: ChatStateService,
    private whatsappService: WhatsappService,
    private gatewayService: GatewayService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 🔀 Transferir chat a otro agente SIN cerrar
   */
  async transferChat(
    chatId: string,
    newAgentId: string,
    transferReason: string,
    supervisorId?: string,
  ): Promise<Chat> {
    this.logger.log(
      `🔀 [TRANSFER] Iniciando transferencia de chat ${chatId} a agente ${newAgentId}`,
    );

    // 1. Validaciones
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['assignedAgent', 'client', 'campaign', 'whatsappNumber'],
    });

    if (!chat) {
      throw new BadRequestException(`Chat ${chatId} no encontrado`);
    }

    // No permitir transferencia si está cerrando o cerrado
    if (
      [ChatStatus.CLOSING, ChatStatus.CLOSED, ChatStatus.SYSTEM_TIMEOUT].includes(
        chat.status,
      )
    ) {
      throw new BadRequestException(
        `No se puede transferir un chat en estado ${chat.status}`,
      );
    }

    const oldAgent = chat.assignedAgent;

    // Validar que el nuevo agente exista y esté disponible
    const newAgent = await this.userRepository.findOne({
      where: { id: newAgentId, isActive: true },
    });

    if (!newAgent) {
      throw new BadRequestException(`Agente ${newAgentId} no encontrado o inactivo`);
    }

    // Validar que no sea el mismo agente
    if (oldAgent?.id === newAgentId) {
      throw new BadRequestException('No puedes transferir a ti mismo');
    }

    // Validar capacidad del nuevo agente
    const maxChatsPerAgent = 10; // Configurable
    if (newAgent.currentChatsCount >= maxChatsPerAgent) {
      throw new BadRequestException(
        `El agente ${newAgent.fullName} ya tiene el máximo de chats asignados`,
      );
    }

    try {
      // 2. Estado de transferencia temporal
      await this.chatStateService.transition(
        chatId,
        ChatStatus.TRANSFERRING,
        undefined,
        {
          reason: transferReason,
          triggeredBy: 'supervisor',
          agentId: supervisorId,
          metadata: {
            oldAgentId: oldAgent?.id,
            oldAgentName: oldAgent?.fullName,
            newAgentId: newAgent.id,
            newAgentName: newAgent.fullName,
          },
        },
      );

      // 3. Decrementar contador del agente anterior
      if (oldAgent) {
        oldAgent.currentChatsCount = Math.max(0, oldAgent.currentChatsCount - 1);
        await this.userRepository.save(oldAgent);
        this.logger.log(
          `📉 [TRANSFER] Contador de ${oldAgent.fullName}: ${oldAgent.currentChatsCount}`,
        );
      }

      // 4. Incrementar contador del nuevo agente
      newAgent.currentChatsCount += 1;
      await this.userRepository.save(newAgent);
      this.logger.log(
        `📈 [TRANSFER] Contador de ${newAgent.fullName}: ${newAgent.currentChatsCount}`,
      );

      // 5. Actualizar asignación del chat
      chat.assignedAgent = newAgent;
      chat.assignedAgentId = newAgent.id;
      chat.transferCount = (chat.transferCount || 0) + 1;
      await this.chatRepository.save(chat);

      // 6. Enviar mensaje de transferencia al cliente
      const transferMessage = `🔄 *Tu chat ha sido transferido*

Un momento por favor, tu caso está siendo atendido por ${newAgent.fullName}.

Enseguida estará contigo para continuar con la gestión de tu cuenta.

*Gracias por tu paciencia* 🙏`;

      await this.whatsappService.sendMessage(
        chat.whatsappNumber.sessionName,
        chat.contactPhone,
        transferMessage,
      );

      this.logger.log(`💬 [TRANSFER] Mensaje de transferencia enviado al cliente`);

      // 7. Transicionar a asignado con nuevo agente
      await this.chatStateService.transition(
        chatId,
        ChatStatus.AGENT_ASSIGNED,
        undefined,
        {
          reason: `Transferido desde ${oldAgent?.fullName || 'sistema'}`,
          triggeredBy: 'supervisor',
          agentId: supervisorId,
          metadata: {
            transferReason,
            oldAgentId: oldAgent?.id,
            newAgentId: newAgent.id,
            transferCount: chat.transferCount,
          },
        },
      );

      // 8. Notificaciones WebSocket
      if (oldAgent) {
        // Remover del panel del agente anterior
        this.gatewayService.notifyAgentChatRemoved(oldAgent.id, chatId);
        this.logger.log(
          `🔔 [TRANSFER] Notificación de remoción enviada a ${oldAgent.fullName}`,
        );
      }

      // Notificar al nuevo agente
      this.gatewayService.notifyAgentNewChat(newAgent.id, chat);
      this.gatewayService.playSoundNotification(newAgent.id, 'transfer');
      this.logger.log(
        `🔔 [TRANSFER] Notificación de nuevo chat enviada a ${newAgent.fullName}`,
      );

      // 9. Emitir evento de transferencia completada
      this.eventEmitter.emit('chat.transferred.complete', {
        chat,
        oldAgent,
        newAgent,
        transferReason,
        supervisorId,
      });

      this.logger.log(`✅ [TRANSFER] Chat ${chatId} transferido exitosamente`);

      return chat;
    } catch (error) {
      this.logger.error(
        `❌ [TRANSFER] Error al transferir chat ${chatId}: ${error.message}`,
        error.stack,
      );

      // Intentar revertir a estado anterior
      try {
        await this.chatStateService.transition(
          chatId,
          chat.status, // Estado original
          undefined,
          {
            reason: `Error en transferencia: ${error.message}`,
            triggeredBy: 'system',
          },
        );
      } catch (revertError) {
        this.logger.error(
          `❌ [TRANSFER] No se pudo revertir estado del chat: ${revertError.message}`,
        );
      }

      throw error;
    }
  }

  /**
   * 📊 Historial de transferencias de un chat
   */
  async getTransferHistory(chatId: string): Promise<any[]> {
    const transitions = await this.chatStateService.getTransitionHistory(chatId);

    return transitions
      .filter((t) => t.fromStatus === ChatStatus.TRANSFERRING)
      .map((t) => ({
        timestamp: t.createdAt,
        oldAgent: t.metadata?.oldAgentName,
        newAgent: t.metadata?.newAgentName,
        reason: t.reason,
        supervisor: t.agentId,
      }));
  }

  /**
   * 📈 Estadísticas de transferencias
   */
  async getTransferStatistics(period: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const intervals = {
      day: '1 day',
      week: '7 days',
      month: '30 days',
    };

    const query = `
      SELECT 
        metadata->>'newAgentName' as agent_name,
        COUNT(*) as received_transfers,
        AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY chat_id ORDER BY created_at)))) as avg_time_between_transfers
      FROM chat_state_transitions
      WHERE to_status = 'agent_assigned'
        AND from_status = 'transferring'
        AND created_at >= NOW() - INTERVAL '${intervals[period]}'
      GROUP BY metadata->>'newAgentName'
      ORDER BY received_transfers DESC
    `;

    const results = await this.chatRepository.query(query);
    return results;
  }
}
```

## 🎛️ Controller para Transferencias

```typescript
// backend/src/modules/chats/chats.controller.ts

@Controller('chats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChatsController {
  constructor(
    private transferService: TransferService,
    // ... otros servicios
  ) {}

  /**
   * 🔀 Transferir chat a otro agente
   */
  @Post(':chatId/transfer')
  @Permissions('chats:transfer')
  async transferChat(
    @Param('chatId') chatId: string,
    @Body()
    dto: {
      newAgentId: string;
      transferReason: string;
    },
    @Req() req: any,
  ) {
    const supervisorId = req.user.id;
    const chat = await this.transferService.transferChat(
      chatId,
      dto.newAgentId,
      dto.transferReason,
      supervisorId,
    );

    return {
      success: true,
      message: 'Chat transferido exitosamente',
      data: {
        chatId: chat.id,
        newAgentId: chat.assignedAgentId,
        newAgentName: chat.assignedAgent?.fullName,
        transferCount: chat.transferCount,
      },
    };
  }

  /**
   * 📜 Historial de transferencias
   */
  @Get(':chatId/transfer-history')
  @Permissions('chats:view-details')
  async getTransferHistory(@Param('chatId') chatId: string) {
    const history = await this.transferService.getTransferHistory(chatId);
    return {
      success: true,
      data: history,
    };
  }

  /**
   * 📊 Estadísticas de transferencias
   */
  @Get('transfers/statistics')
  @Permissions('chats:view-statistics')
  async getTransferStatistics(@Query('period') period: 'day' | 'week' | 'month') {
    const stats = await this.transferService.getTransferStatistics(period || 'day');
    return {
      success: true,
      data: stats,
    };
  }
}
```

## 📱 Componente Frontend - Modal de Transferencia

```typescript
// frontend/src/components/chat/TransferChatModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, Select, Input, message, Tag } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { chatsApi } from '../../api/chats';
import { usersApi } from '../../api/users';

interface TransferChatModalProps {
  chatId: string;
  currentAgentName: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TransferChatModal: React.FC<TransferChatModalProps> = ({
  chatId,
  currentAgentName,
  visible,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  useEffect(() => {
    if (visible) {
      loadAvailableAgents();
    }
  }, [visible]);

  const loadAvailableAgents = async () => {
    try {
      const response = await usersApi.getAvailableAgents();
      setAgents(response.data);
    } catch (error) {
      message.error('Error al cargar agentes disponibles');
    }
  };

  const handleTransfer = async () => {
    if (!selectedAgentId) {
      message.error('Selecciona un agente');
      return;
    }

    if (!transferReason.trim()) {
      message.error('Ingresa el motivo de transferencia');
      return;
    }

    setLoading(true);
    try {
      await chatsApi.transferChat(chatId, {
        newAgentId: selectedAgentId,
        transferReason,
      });

      message.success('Chat transferido exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al transferir chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <SwapOutlined /> Transferir Chat
        </span>
      }
      open={visible}
      onOk={handleTransfer}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Confirmar Transferencia"
      cancelText="Cancelar"
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <p>
          <strong>Agente actual:</strong> {currentAgentName}
        </p>
        <p style={{ color: '#666' }}>
          El chat será transferido al nuevo agente sin cerrar la conversación. Se
          mantendrá todo el historial de mensajes.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Nuevo agente: <span style={{ color: 'red' }}>*</span>
        </label>
        <Select
          style={{ width: '100%' }}
          placeholder="Selecciona el agente"
          value={selectedAgentId}
          onChange={setSelectedAgentId}
          showSearch
          optionFilterProp="label"
        >
          {agents.map((agent: any) => (
            <Select.Option
              key={agent.id}
              value={agent.id}
              label={agent.fullName}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{agent.fullName}</span>
                <Tag color={agent.currentChatsCount < 5 ? 'green' : 'orange'}>
                  {agent.currentChatsCount} chats
                </Tag>
              </div>
            </Select.Option>
          ))}
        </Select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Motivo de transferencia: <span style={{ color: 'red' }}>*</span>
        </label>
        <Input.TextArea
          value={transferReason}
          onChange={(e) => setTransferReason(e.target.value)}
          placeholder="Ej: Cliente solicita hablar con supervisor..."
          rows={4}
          maxLength={300}
          showCount
        />
      </div>
    </Modal>
  );
};
```
