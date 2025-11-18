import { Injectable, Logger } from '@nestjs/common';
import { RoutingStrategy } from './routing-strategy.interface';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../chats/entities/chat.entity';

@Injectable()
export class RoundRobinStrategy implements RoutingStrategy {
  private readonly logger = new Logger(RoundRobinStrategy.name);
  private currentIndex = 0;

  selectAgent(availableAgents: User[], chat: Chat): User | null {
    if (!availableAgents || availableAgents.length === 0) {
      this.logger.warn('No hay agentes disponibles para asignación');
      return null;
    }

    // Seleccionar siguiente agente en rotación
    const agent = availableAgents[this.currentIndex % availableAgents.length];
    this.currentIndex = (this.currentIndex + 1) % availableAgents.length;

    this.logger.log(`Agente seleccionado por Round Robin: ${agent.fullName}`);
    return agent;
  }

  getName(): string {
    return 'round-robin';
  }
}
