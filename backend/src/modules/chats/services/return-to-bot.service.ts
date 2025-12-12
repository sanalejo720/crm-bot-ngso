import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { ChatStateService } from './chat-state.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { ChatsExportService } from '../chats-export.service';
import { MessageType } from '../../messages/entities/message.entity';

@Injectable()
export class ReturnToBotService {
  private readonly logger = new Logger(ReturnToBotService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    private chatStateService: ChatStateService,
    private whatsappService: WhatsappService,
    private chatsExportService: ChatsExportService,
  ) {}

  /**
   * Retornar un chat al bot
   * - Genera PDF del chat antes de cerrar
   * - Envía mensaje de despedida al cliente
   * - Reinicia el contexto del bot
   * - Cambia estado a BOT
   */
  async returnChatToBot(
    chatId: string,
    reason: string,
    agentId: string,
    notes?: string,
  ): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['assignedAgent', 'campaign', 'whatsappNumber', 'debtor'],
    });

    if (!chat) {
      throw new NotFoundException(`Chat ${chatId} no encontrado`);
    }

    // Verificar que el chat esté en un estado válido para retornar al bot
    const validStatuses = ['waiting', 'active', 'pending'];
    if (!validStatuses.includes(chat.status)) {
      throw new BadRequestException(
        `No se puede retornar al bot un chat en estado ${chat.status}. Estados válidos: ${validStatuses.join(', ')}`
      );
    }

    this.logger.log(`🔄 Iniciando retorno al bot para chat ${chatId}. Motivo: ${reason}`);

    try {
      // 1. Generar PDF del chat antes de cerrar
      this.logger.log(`📄 Generando PDF del chat ${chatId}...`);
      await this.chatsExportService.exportChatToPDF(chatId, 'promise', agentId);
      this.logger.log(`✅ PDF generado exitosamente`);

      // 2. Enviar mensaje de despedida personalizado al cliente
      const farewellMessage = this.generateFarewellMessage(reason);
      
      if (chat.whatsappNumber?.id) {
        await this.whatsappService.sendMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          farewellMessage,
          MessageType.TEXT,
        );
        this.logger.log(`💬 Mensaje de despedida enviado al cliente`);
      }

      // 3. Transicionar el estado a BOT con reinicio
      await this.chatStateService.transition(
        chatId,
        'bot' as any,
        'bot_active',
        {
          reason: `Retornado al bot: ${reason}${notes ? ' - ' + notes : ''}`,
          triggeredBy: 'agent',
          agentId,
        },
      );

      // 4. Desasignar el agente y decrementar contador
      if (chat.assignedAgentId) {
        await this.chatRepository.update(chatId, {
          assignedAgentId: null,
        });

        // Decrementar contador de chats del agente
        await this.chatRepository.manager.query(
          `UPDATE users SET "currentChatsCount" = GREATEST("currentChatsCount" - 1, 0) WHERE id = $1`,
          [chat.assignedAgentId],
        );
      }

      // 5. Reiniciar contador de transferencias y restarts del bot
      await this.chatRepository.update(chatId, {
        transferCount: 0,
        botRestartCount: () => '"botRestartCount" + 1',
      });

      this.logger.log(`✅ Chat ${chatId} retornado al bot exitosamente`);

      return this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['assignedAgent', 'campaign', 'debtor'],
      });
    } catch (error) {
      this.logger.error(`❌ Error retornando chat ${chatId} al bot: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generar mensaje de despedida personalizado según el motivo
   */
  private generateFarewellMessage(reason: string): string {
    const greeting = 'Hola';

    const messages = {
      'cliente_no_responde': `${greeting}, hemos intentado comunicarnos contigo pero no hemos recibido respuesta. Si necesitas ayuda, puedes escribirnos nuevamente y con gusto te atenderemos. ¡Que tengas un excelente día! 😊`,
      
      'solicitud_completada': `${greeting}, hemos completado tu solicitud exitosamente. Si necesitas algo más, no dudes en escribirnos. ¡Gracias por comunicarte con nosotros! 🙌`,
      
      'informacion_enviada': `${greeting}, te hemos enviado toda la información solicitada. Si tienes alguna duda adicional, puedes escribirnos cuando lo necesites. ¡Estamos para ayudarte! 📋`,
      
      'derivado_otro_canal': `${greeting}, tu consulta será gestionada por otro canal. En breve nos comunicaremos contigo. ¡Gracias por tu paciencia! 📞`,
      
      'fuera_horario': `${greeting}, te contactamos fuera del horario de atención. Puedes escribirnos en nuestro horario de atención y con gusto te ayudaremos. ¡Hasta pronto! 🕐`,
      
      default: `${greeting}, gracias por comunicarte con nosotros. Si necesitas ayuda en el futuro, estaremos disponibles para atenderte. ¡Que tengas un excelente día! 😊`,
    };

    return messages[reason] || messages.default;
  }

  /**
   * Obtener estadísticas de retornos al bot
   */
  async getReturnStats(agentId?: string, startDate?: Date, endDate?: Date) {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .select('COUNT(*)', 'total')
      .addSelect('chat.status', 'current_status')
      .where('chat.botRestartCount > 0');

    if (agentId) {
      query.andWhere(
        'EXISTS (SELECT 1 FROM chat_state_transitions WHERE "chatId" = chat.id AND "agentId" = :agentId AND reason LIKE :pattern)',
        { agentId, pattern: 'Retornado al bot:%' }
      );
    }

    if (startDate && endDate) {
      query.andWhere('chat.updatedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    query.groupBy('chat.status');

    return query.getRawMany();
  }
}
