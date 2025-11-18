import { User } from '../../users/entities/user.entity';
import { Chat } from '../../chats/entities/chat.entity';

export interface RoutingStrategy {
  /**
   * Seleccionar el mejor agente disponible para un chat
   */
  selectAgent(availableAgents: User[], chat: Chat): User | null;

  /**
   * Nombre de la estrategia
   */
  getName(): string;
}
