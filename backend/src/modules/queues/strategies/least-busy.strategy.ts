import { Injectable, Logger } from '@nestjs/common';
import { RoutingStrategy } from './routing-strategy.interface';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../chats/entities/chat.entity';

@Injectable()
export class LeastBusyStrategy implements RoutingStrategy {
  private readonly logger = new Logger(LeastBusyStrategy.name);

  selectAgent(availableAgents: User[], chat: Chat): User | null {
    if (!availableAgents || availableAgents.length === 0) {
      this.logger.warn('No hay agentes disponibles para asignación');
      return null;
    }

    // Ordenar por menor carga actual
    const sortedAgents = [...availableAgents].sort(
      (a, b) => a.currentChatsCount - b.currentChatsCount,
    );

    const agent = sortedAgents[0];

    this.logger.log(
      `Agente seleccionado por Least Busy: ${agent.fullName} (${agent.currentChatsCount} chats)`,
    );

    return agent;
  }

  getName(): string {
    return 'least-busy';
  }
}
