import { Injectable, Logger } from '@nestjs/common';
import { RoutingStrategy } from './routing-strategy.interface';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../chats/entities/chat.entity';

@Injectable()
export class SkillsBasedStrategy implements RoutingStrategy {
  private readonly logger = new Logger(SkillsBasedStrategy.name);

  selectAgent(availableAgents: User[], chat: Chat): User | null {
    if (!availableAgents || availableAgents.length === 0) {
      this.logger.warn('No hay agentes disponibles para asignación');
      return null;
    }

    // Obtener habilidades requeridas del chat (desde metadata o tags)
    const requiredSkills = chat.tags || [];

    if (requiredSkills.length === 0) {
      // Si no hay habilidades requeridas, usar Least Busy
      const sortedAgents = [...availableAgents].sort(
        (a, b) => a.currentChatsCount - b.currentChatsCount,
      );
      return sortedAgents[0];
    }

    // Filtrar agentes que tienen las habilidades requeridas
    const matchingAgents = availableAgents.filter((agent) => {
      if (!agent.skills || agent.skills.length === 0) {
        return false;
      }

      // Verificar si el agente tiene al menos una de las habilidades requeridas
      return requiredSkills.some((skill) => agent.skills.includes(skill));
    });

    if (matchingAgents.length === 0) {
      this.logger.warn(
        `No hay agentes con habilidades requeridas: ${requiredSkills.join(', ')}`,
      );
      
      // Fallback: usar cualquier agente disponible
      const sortedAgents = [...availableAgents].sort(
        (a, b) => a.currentChatsCount - b.currentChatsCount,
      );
      return sortedAgents[0];
    }

    // Seleccionar el agente con menor carga entre los que tienen las habilidades
    const sortedMatching = [...matchingAgents].sort(
      (a, b) => a.currentChatsCount - b.currentChatsCount,
    );

    const agent = sortedMatching[0];

    this.logger.log(
      `Agente seleccionado por Skills: ${agent.fullName} (${agent.currentChatsCount} chats, skills: ${agent.skills.join(', ')})`,
    );

    return agent;
  }

  getName(): string {
    return 'skills-based';
  }
}
