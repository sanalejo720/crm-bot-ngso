// Monitoring Service - NGS&O CRM Gestión
// Sistema de monitoreo y alertas de mensajes
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Message } from '../messages/entities/message.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface OffensiveWordMatch {
  word: string;
  category: 'abuse' | 'threat' | 'discrimination' | 'profanity';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MessageAlert {
  messageId: string;
  chatId: string;
  direction: 'inbound' | 'outbound';
  sender: 'agent' | 'client';
  content: string;
  matches: OffensiveWordMatch[];
  timestamp: Date;
  agentId?: string;
  agentName?: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  // Palabras ofensivas hacia el cliente (por parte del asesor)
  private readonly agentOffensiveWords = {
    abuse: {
      high: ['idiota', 'estúpido', 'tonto', 'burro', 'imbécil', 'inútil'],
      medium: ['molesto', 'fastidioso', 'pesado', 'insoportable'],
      low: ['no entiende', 'difícil', 'complicado'],
    },
    threat: {
      critical: ['amenaza', 'voy a', 'te voy', 'cuidado'],
      high: ['problema', 'consecuencias'],
    },
    discrimination: {
      critical: ['negro', 'indio', 'pobre', 'ignorante'],
      high: ['analfabeto', 'sin educación'],
    },
    profanity: {
      high: ['mierda', 'carajo', 'puta', 'joder', 'coño', 'verga', 'hijueputa'],
      medium: ['diablos', 'demonio'],
    },
  };

  // Palabras ofensivas hacia el asesor (por parte del cliente)
  private readonly clientOffensiveWords = {
    abuse: {
      high: ['idiota', 'estúpido', 'tonto', 'burro', 'imbécil', 'inútil', 'malparido', 'gonorrea'],
      medium: ['incompetente', 'inservible', 'malo', 'pésimo'],
      low: ['lento', 'ineficiente'],
    },
    threat: {
      critical: ['matar', 'denunciar', 'demandar', 'acusar', 'quemar'],
      high: ['reportar', 'quejar', 'problema grave'],
    },
    profanity: {
      high: ['mierda', 'carajo', 'puta', 'joder', 'coño', 'verga', 'hijueputa', 'hp'],
      medium: ['maldito', 'maldita', 'diablos'],
    },
  };

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Analizar mensaje en busca de palabras ofensivas
   */
  analyzeMessage(
    messageId: string,
    chatId: string,
    content: string,
    direction: 'inbound' | 'outbound',
    senderType: 'agent' | 'client',
    agentId?: string,
    agentName?: string,
  ): MessageAlert | null {
    const matches: OffensiveWordMatch[] = [];
    const contentLower = content.toLowerCase();

    // Seleccionar diccionario según el emisor
    const dictionary = senderType === 'agent' ? this.agentOffensiveWords : this.clientOffensiveWords;

    // Buscar palabras ofensivas por categoría
    Object.keys(dictionary).forEach((category) => {
      Object.keys(dictionary[category]).forEach((severity) => {
        dictionary[category][severity].forEach((word) => {
          if (contentLower.includes(word.toLowerCase())) {
            matches.push({
              word,
              category: category as any,
              severity: severity as any,
            });
          }
        });
      });
    });

    if (matches.length > 0) {
      const alert: MessageAlert = {
        messageId,
        chatId,
        direction,
        sender: senderType,
        content,
        matches,
        timestamp: new Date(),
        agentId,
        agentName,
      };

      this.logger.warn(
        `⚠️ Palabras ofensivas detectadas en mensaje ${messageId} (${senderType}): ${matches.length} coincidencias`,
      );

      // Emitir evento de alerta
      this.eventEmitter.emit('monitoring.offensive-words-detected', alert);

      return alert;
    }

    return null;
  }

  /**
   * Obtener estadísticas de mensajes por número de WhatsApp
   */
  async getNumberStats(numberId: string, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.chat', 'chat')
      .leftJoin('chat.whatsappNumber', 'whatsappNumber')
      .where('whatsappNumber.id = :numberId', { numberId })
      .andWhere('message.createdAt >= :startDate', { startDate })
      .select([
        'COUNT(*) as total_messages',
        'COUNT(CASE WHEN message.direction = :outbound THEN 1 END) as sent',
        'COUNT(CASE WHEN message.direction = :inbound THEN 1 END) as received',
        'MAX(message.createdAt) as last_message_at',
      ])
      .setParameters({ outbound: 'outbound', inbound: 'inbound' })
      .getRawOne();

    return {
      numberId,
      totalMessages: parseInt(messages.total_messages) || 0,
      messagesSent: parseInt(messages.sent) || 0,
      messagesReceived: parseInt(messages.received) || 0,
      lastMessageAt: messages.last_message_at,
      periodDays: days,
    };
  }

  /**
   * Obtener ranking de números por actividad
   */
  async getNumbersRanking(limit: number = 10, days: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const ranking = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.chat', 'chat')
      .leftJoin('chat.whatsappNumber', 'whatsappNumber')
      .where('message.createdAt >= :startDate', { startDate })
      .groupBy('whatsappNumber.id')
      .addGroupBy('whatsappNumber.phoneNumber')
      .addGroupBy('whatsappNumber.displayName')
      .select([
        'whatsappNumber.id as number_id',
        'whatsappNumber.phoneNumber as phone_number',
        'whatsappNumber.displayName as display_name',
        'COUNT(*) as total_messages',
        'COUNT(CASE WHEN message.direction = :outbound THEN 1 END) as sent',
        'COUNT(CASE WHEN message.direction = :inbound THEN 1 END) as received',
        'MAX(message.createdAt) as last_message_at',
      ])
      .setParameters({ outbound: 'outbound', inbound: 'inbound' })
      .orderBy('total_messages', 'DESC')
      .limit(limit)
      .getRawMany();

    return ranking.map((item) => ({
      numberId: item.number_id,
      phoneNumber: item.phone_number,
      displayName: item.display_name,
      totalMessages: parseInt(item.total_messages),
      messagesSent: parseInt(item.sent),
      messagesReceived: parseInt(item.received),
      lastMessageAt: item.last_message_at,
    }));
  }

  /**
   * Obtener alertas recientes
   */
  async getRecentAlerts(limit: number = 50): Promise<any[]> {
    // Esta función retornará alertas almacenadas
    // Por ahora retorna un array vacío, se puede implementar con una tabla de alertas
    return [];
  }

  /**
   * Agregar palabra ofensiva personalizada
   */
  addCustomOffensiveWord(
    word: string,
    category: 'abuse' | 'threat' | 'discrimination' | 'profanity',
    severity: 'low' | 'medium' | 'high' | 'critical',
    target: 'agent' | 'client' | 'both',
  ): void {
    if (target === 'agent' || target === 'both') {
      if (!this.agentOffensiveWords[category][severity]) {
        this.agentOffensiveWords[category][severity] = [];
      }
      this.agentOffensiveWords[category][severity].push(word);
    }

    if (target === 'client' || target === 'both') {
      if (!this.clientOffensiveWords[category][severity]) {
        this.clientOffensiveWords[category][severity] = [];
      }
      this.clientOffensiveWords[category][severity].push(word);
    }

    this.logger.log(`✅ Palabra ofensiva agregada: "${word}" (${category}/${severity}/${target})`);
  }

  /**
   * Obtener todas las palabras ofensivas configuradas
   */
  getOffensiveWords(): any {
    return {
      agent: this.agentOffensiveWords,
      client: this.clientOffensiveWords,
    };
  }
}
