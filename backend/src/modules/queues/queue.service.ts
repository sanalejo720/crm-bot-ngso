import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { OnEvent } from '@nestjs/event-emitter';
import { ChatsService } from '../chats/chats.service';
import { UsersService } from '../users/users.service';
import { Chat } from '../chats/entities/chat.entity';
import { RoundRobinStrategy } from './strategies/round-robin.strategy';
import { LeastBusyStrategy } from './strategies/least-busy.strategy';
import { SkillsBasedStrategy } from './strategies/skills-based.strategy';
import { RoutingStrategy } from './strategies/routing-strategy.interface';

export interface ChatAssignmentJob {
  chatId: string;
  campaignId: string;
  strategy?: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private strategies: Map<string, RoutingStrategy>;

  constructor(
    @InjectQueue('chat-assignment') private chatAssignmentQueue: Queue,
    private chatsService: ChatsService,
    private usersService: UsersService,
    private roundRobinStrategy: RoundRobinStrategy,
    private leastBusyStrategy: LeastBusyStrategy,
    private skillsBasedStrategy: SkillsBasedStrategy,
  ) {
    // Registrar estrategias disponibles
    this.strategies = new Map<string, RoutingStrategy>([
      ['round-robin', roundRobinStrategy as RoutingStrategy],
      ['least-busy', leastBusyStrategy as RoutingStrategy],
      ['skills-based', skillsBasedStrategy as RoutingStrategy],
    ]);
  }

  /**
   * Listener: Cuando se crea un chat nuevo
   */
  @OnEvent('chat.created')
  async handleChatCreated(chat: Chat) {
    this.logger.log(`Chat creado detectado: ${chat.id}`);

    // Obtener configuración de la campaña
    const campaign = chat.campaign;

    if (!campaign || !campaign.settings?.autoAssignment) {
      this.logger.log('Auto-asignación deshabilitada para esta campaña');
      return;
    }

    // Agregar a cola de asignación
    await this.addChatToQueue(chat.id, chat.campaignId, campaign.settings.assignmentStrategy);
  }

  /**
   * Agregar chat a la cola de asignación
   */
  async addChatToQueue(
    chatId: string,
    campaignId: string,
    strategy: string = 'least-busy',
  ): Promise<void> {
    const job = await this.chatAssignmentQueue.add(
      'assign-chat',
      {
        chatId,
        campaignId,
        strategy,
      } as ChatAssignmentJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );

    this.logger.log(`Chat ${chatId} agregado a cola con job ID: ${job.id}`);
  }

  /**
   * Procesar asignación de chat (ejecutado por el processor)
   */
  async processAssignment(job: ChatAssignmentJob): Promise<void> {
    const { chatId, campaignId, strategy } = job;

    this.logger.log(`Procesando asignación de chat ${chatId} con estrategia ${strategy}`);

    try {
      // Obtener chat
      const chat = await this.chatsService.findOne(chatId);

      // Verificar si ya fue asignado
      if (chat.assignedAgentId) {
        this.logger.log(`Chat ${chatId} ya fue asignado previamente`);
        return;
      }

      // Obtener agentes disponibles de la campaña
      const availableAgents = await this.usersService.getAvailableAgents(campaignId);

      if (availableAgents.length === 0) {
        this.logger.warn(`No hay agentes disponibles para campaña ${campaignId}`);
        // Reintentar más tarde
        throw new Error('No hay agentes disponibles');
      }

      // Seleccionar estrategia
      const routingStrategy = this.strategies.get(strategy) || this.leastBusyStrategy;

      // Seleccionar agente
      const selectedAgent = routingStrategy.selectAgent(availableAgents, chat);

      if (!selectedAgent) {
        throw new Error('No se pudo seleccionar un agente');
      }

      // Asignar chat al agente
      await this.chatsService.assign(chatId, selectedAgent.id);

      this.logger.log(`Chat ${chatId} asignado exitosamente a ${selectedAgent.fullName}`);
    } catch (error) {
      this.logger.error(`Error procesando asignación de chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de la cola
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.chatAssignmentQueue.getWaitingCount(),
      this.chatAssignmentQueue.getActiveCount(),
      this.chatAssignmentQueue.getCompletedCount(),
      this.chatAssignmentQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active,
    };
  }

  /**
   * Limpiar trabajos completados
   */
  async cleanQueue(): Promise<void> {
    await this.chatAssignmentQueue.clean(3600000, 'completed'); // 1 hora
    await this.chatAssignmentQueue.clean(86400000, 'failed'); // 24 horas
    this.logger.log('Cola limpiada');
  }

  /**
   * Pausar cola
   */
  async pauseQueue(): Promise<void> {
    await this.chatAssignmentQueue.pause();
    this.logger.log('Cola pausada');
  }

  /**
   * Reanudar cola
   */
  async resumeQueue(): Promise<void> {
    await this.chatAssignmentQueue.resume();
    this.logger.log('Cola reanudada');
  }
}
