# SOLUCIÓN 4: Retorno al Bot y Generación de PDF

## 🔄 ReturnToBotService - Servicio de Retorno al Bot

```typescript
// backend/src/modules/chats/services/return-to-bot.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Chat, ChatStatus, ChatSubStatus } from '../entities/chat.entity';
import { ChatStateService } from './chat-state.service';
import { ChatsExportService } from './chats-export.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { User } from '../../users/entities/user.entity';

export enum ReturnReason {
  CLIENT_DECLINED = 'client_declined',
  NO_AGREEMENT = 'no_agreement',
  INVALID_CASE = 'invalid_case',
  CLIENT_NOT_RESPONDING = 'client_not_responding',
  OTHER = 'other',
}

@Injectable()
export class ReturnToBotService {
  private readonly logger = new Logger(ReturnToBotService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatStateService: ChatStateService,
    private chatsExportService: ChatsExportService,
    private whatsappService: WhatsappService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 🔙 Retornar chat al bot y generar PDF
   */
  async returnChatToBot(
    chatId: string,
    returnReason: ReturnReason,
    agentNotes?: string,
  ): Promise<{ chat: Chat; pdfPath: string }> {
    this.logger.log(
      `🔙 [RETURN-TO-BOT] Iniciando retorno de chat ${chatId} al bot. Razón: ${returnReason}`,
    );

    // 1. Cargar chat con todas las relaciones necesarias
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: [
        'assignedAgent',
        'client',
        'debtor',
        'campaign',
        'whatsappNumber',
        'messages',
      ],
    });

    if (!chat) {
      throw new Error(`Chat ${chatId} no encontrado`);
    }

    const previousAgent = chat.assignedAgent;

    try {
      // 2. Generar PDF de cierre ANTES de modificar el estado
      this.logger.log(`📄 [RETURN-TO-BOT] Generando PDF de cierre...`);
      const pdfPath = await this.chatsExportService.generateChatPDF(
        chat,
        agentNotes || `Chat retornado al bot. Razón: ${returnReason}`,
      );
      this.logger.log(`✅ [RETURN-TO-BOT] PDF generado: ${pdfPath}`);

      // 3. Decrementar contador del agente anterior
      if (previousAgent) {
        previousAgent.currentChatsCount = Math.max(
          0,
          previousAgent.currentChatsCount - 1,
        );
        await this.userRepository.save(previousAgent);
        this.logger.log(
          `📉 [RETURN-TO-BOT] Contador de ${previousAgent.fullName} decrementado: ${previousAgent.currentChatsCount}`,
        );
      }

      // 4. Enviar mensaje de cierre al cliente
      const farewellMessage = this.getFarewellMessage(returnReason);
      await this.whatsappService.sendMessage(
        chat.whatsappNumber.sessionName,
        chat.contactPhone,
        farewellMessage,
      );
      this.logger.log(`💬 [RETURN-TO-BOT] Mensaje de despedida enviado`);

      // 5. Transicionar el chat al bot inicial
      await this.chatStateService.transition(
        chatId,
        ChatStatus.BOT_INITIAL,
        undefined,
        {
          reason: `Retornado al bot - ${returnReason}`,
          triggeredBy: 'agent',
          agentId: previousAgent?.id,
          metadata: {
            returnReason,
            agentNotes,
            pdfGenerated: pdfPath,
            previousAgentId: previousAgent?.id,
            previousAgentName: previousAgent?.fullName,
          },
        },
      );

      // 6. Reiniciar contexto del bot
      chat.botContext = {
        chatId: chat.id,
        flowId: chat.campaign.settings.botFlowId,
        currentNodeId: null, // Reiniciar desde el inicio
        variables: {},
        createdAt: new Date(),
        transferredToAgent: false,
      };
      await this.chatRepository.save(chat);

      // 7. Emitir eventos
      this.eventEmitter.emit('chat.returned.to.bot.complete', {
        chat,
        previousAgent,
        returnReason,
        pdfPath,
      });

      this.logger.log(
        `✅ [RETURN-TO-BOT] Chat ${chatId} retornado exitosamente al bot`,
      );

      return { chat, pdfPath };
    } catch (error) {
      this.logger.error(
        `❌ [RETURN-TO-BOT] Error al retornar chat ${chatId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 💬 Obtener mensaje de despedida según la razón
   */
  private getFarewellMessage(reason: ReturnReason): string {
    const messages: Record<ReturnReason, string> = {
      [ReturnReason.CLIENT_DECLINED]: `✅ *Gracias por contactarnos*

Entendemos que no deseas continuar en este momento.

Si en el futuro cambias de opinión o necesitas más información sobre tu cuenta, puedes escribirnos nuevamente y el sistema te atenderá automáticamente.

*Equipo de Soporte NGSO* 📞`,

      [ReturnReason.NO_AGREEMENT]: `✅ *Gracias por comunicarte*

Lamentamos no haber llegado a un acuerdo en esta ocasión.

Si deseas retomar la negociación o explorar nuevas opciones de pago, puedes contactarnos nuevamente ingresando tu información y un asesor te atenderá.

*Equipo de Soporte NGSO* 📞`,

      [ReturnReason.INVALID_CASE]: `✅ *Gracias por contactarte*

Hemos revisado tu caso y en este momento no aplica para el proceso de gestión.

Si tienes dudas adicionales o tu situación cambia, puedes escribirnos nuevamente.

*Equipo de Soporte NGSO* 📞`,

      [ReturnReason.CLIENT_NOT_RESPONDING]: `✅ *Tu conversación ha sido cerrada*

No hemos recibido respuesta de tu parte en el tiempo establecido.

Para continuar con la gestión de tu cuenta, por favor vuelve a ingresar tus datos y un asesor te atenderá nuevamente.

*Equipo de Soporte NGSO* 📞`,

      [ReturnReason.OTHER]: `✅ *Gracias por contactarnos*

Tu conversación ha sido cerrada.

Si necesitas continuar con la gestión de tu cuenta, puedes escribirnos nuevamente y el sistema te atenderá automáticamente.

*Equipo de Soporte NGSO* 📞`,
    };

    return messages[reason] || messages[ReturnReason.OTHER];
  }

  /**
   * 📊 Obtener estadísticas de retornos al bot
   */
  async getReturnStatistics(agentId?: string): Promise<any> {
    const query = `
      SELECT 
        metadata->>'returnReason' as reason,
        COUNT(*) as count,
        agent_id
      FROM chat_state_transitions
      WHERE to_status = 'bot_initial'
        AND from_status != 'closed'
        ${agentId ? `AND agent_id = '${agentId}'` : ''}
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY metadata->>'returnReason', agent_id
      ORDER BY count DESC
    `;

    // Ejecutar query nativa
    const results = await this.chatRepository.query(query);
    return results;
  }
}
```

## 🎛️ Controller para Retorno al Bot

```typescript
// backend/src/modules/chats/chats.controller.ts

@Controller('chats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChatsController {
  constructor(
    private returnToBotService: ReturnToBotService,
    // ... otros servicios
  ) {}

  /**
   * 🔙 Retornar chat al bot
   */
  @Post(':chatId/return-to-bot')
  @Permissions('chats:return-to-bot')
  async returnToBot(
    @Param('chatId') chatId: string,
    @Body()
    dto: {
      returnReason: ReturnReason;
      agentNotes?: string;
    },
    @Req() req: any,
  ) {
    const result = await this.returnToBotService.returnChatToBot(
      chatId,
      dto.returnReason,
      dto.agentNotes,
    );

    return {
      success: true,
      message: 'Chat retornado al bot exitosamente',
      data: {
        chatId: result.chat.id,
        pdfPath: result.pdfPath,
        status: result.chat.status,
      },
    };
  }

  /**
   * 📊 Estadísticas de retornos al bot
   */
  @Get('return-to-bot/statistics')
  @Permissions('chats:view-statistics')
  async getReturnStatistics(@Query('agentId') agentId?: string) {
    const stats = await this.returnToBotService.getReturnStatistics(agentId);
    return {
      success: true,
      data: stats,
    };
  }
}
```

## 🖥️ DTO de Retorno

```typescript
// backend/src/modules/chats/dto/return-to-bot.dto.ts

import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ReturnReason } from '../services/return-to-bot.service';

export class ReturnToBotDto {
  @IsEnum(ReturnReason)
  returnReason: ReturnReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  agentNotes?: string;
}
```

## 📱 Componente Frontend - Botón de Retorno al Bot

```typescript
// frontend/src/components/chat/ReturnToBotButton.tsx

import React, { useState } from 'react';
import { Button, Modal, Select, TextArea, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { chatsApi } from '../../api/chats';

interface ReturnToBotButtonProps {
  chatId: string;
  onSuccess: () => void;
}

export const ReturnToBotButton: React.FC<ReturnToBotButtonProps> = ({
  chatId,
  onSuccess,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [agentNotes, setAgentNotes] = useState('');

  const reasons = [
    { value: 'client_declined', label: 'Cliente no desea continuar' },
    { value: 'no_agreement', label: 'No se llegó a un acuerdo' },
    { value: 'invalid_case', label: 'Caso no aplica' },
    {
      value: 'client_not_responding',
      label: 'Cliente no responde',
    },
    { value: 'other', label: 'Otro motivo' },
  ];

  const handleReturnToBot = async () => {
    if (!returnReason) {
      message.error('Selecciona un motivo de retorno');
      return;
    }

    setLoading(true);
    try {
      await chatsApi.returnToBot(chatId, {
        returnReason,
        agentNotes,
      });

      message.success('Chat retornado al bot exitosamente');
      setIsModalOpen(false);
      onSuccess();
    } catch (error) {
      message.error('Error al retornar chat al bot');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => setIsModalOpen(true)}
        danger
      >
        Retornar al Bot
      </Button>

      <Modal
        title="Retornar Chat al Bot"
        open={isModalOpen}
        onOk={handleReturnToBot}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={loading}
        okText="Confirmar Retorno"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 16 }}>
          <p>
            Esta acción retornará el chat al bot y generará automáticamente el
            PDF de cierre.
          </p>
          <p style={{ fontWeight: 'bold' }}>
            El cliente recibirá un mensaje de despedida y podrá reiniciar el
            proceso.
          </p>
        </div>

        <Select
          style={{ width: '100%', marginBottom: 16 }}
          placeholder="Selecciona el motivo"
          value={returnReason}
          onChange={setReturnReason}
          options={reasons}
        />

        <TextArea
          placeholder="Notas del agente (opcional)"
          value={agentNotes}
          onChange={(e) => setAgentNotes(e.target.value)}
          rows={4}
          maxLength={500}
          showCount
        />
      </Modal>
    </>
  );
};
```
