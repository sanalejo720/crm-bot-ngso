import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotFlow, BotFlowStatus } from './entities/bot-flow.entity';
import { BotNode, BotNodeType } from './entities/bot-node.entity';
import { MessagesService } from '../messages/messages.service';
import { ChatsService } from '../chats/chats.service';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';
import {
  MessageType,
  MessageDirection,
  MessageSenderType,
} from '../messages/entities/message.entity';

export interface BotSession {
  chatId: string;
  flowId: string;
  currentNodeId: string;
  variables: Record<string, any>;
  createdAt: Date;
  lastActivityAt: Date;
}

@Injectable()
export class BotEngineService {
  private readonly logger = new Logger(BotEngineService.name);
  private sessions: Map<string, BotSession> = new Map();

  constructor(
    @InjectRepository(BotFlow)
    private botFlowRepository: Repository<BotFlow>,
    @InjectRepository(BotNode)
    private botNodeRepository: Repository<BotNode>,
    private messagesService: MessagesService,
    private chatsService: ChatsService,
  ) {}

  /**
   * Iniciar flujo de bot para un chat
   */
  async startFlow(chatId: string, flowId: string): Promise<void> {
    this.logger.log(`Iniciando flujo ${flowId} para chat ${chatId}`);

    const flow = await this.botFlowRepository.findOne({
      where: { id: flowId, status: BotFlowStatus.ACTIVE },
      relations: ['nodes'],
    });

    if (!flow) {
      throw new NotFoundException(`Flujo de bot ${flowId} no encontrado o inactivo`);
    }

    if (!flow.startNodeId) {
      throw new Error('El flujo no tiene nodo inicial configurado');
    }

    // Crear sesión
    const session: BotSession = {
      chatId,
      flowId,
      currentNodeId: flow.startNodeId,
      variables: this.initializeVariables(flow),
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(chatId, session);

    // Actualizar chat
    await this.chatsService.update(chatId, {
      status: ChatStatus.BOT,
      botContext: {
        sessionId: chatId,
        flowId,
        currentNodeId: flow.startNodeId,
        variables: session.variables,
        transferredToAgent: false,
      },
    });

    // Ejecutar nodo inicial
    await this.executeNode(chatId, flow.startNodeId);
  }

  /**
   * Procesar respuesta del usuario
   */
  async processUserInput(chatId: string, userInput: string): Promise<void> {
    const session = this.sessions.get(chatId);

    if (!session) {
      this.logger.warn(`No hay sesión activa para chat ${chatId}`);
      return;
    }

    session.lastActivityAt = new Date();

    const currentNode = await this.botNodeRepository.findOne({
      where: { id: session.currentNodeId },
    });

    if (!currentNode) {
      throw new NotFoundException(`Nodo ${session.currentNodeId} no encontrado`);
    }

    // Procesar según tipo de nodo
    let nextNodeId: string | null = null;

    switch (currentNode.type) {
      case BotNodeType.MENU:
        nextNodeId = this.handleMenuInput(currentNode, userInput);
        break;

      case BotNodeType.INPUT:
        nextNodeId = await this.handleTextInput(currentNode, userInput, session);
        break;

      case BotNodeType.CONDITION:
        nextNodeId = this.handleCondition(currentNode, session);
        break;

      default:
        nextNodeId = currentNode.nextNodeId;
    }

    if (!nextNodeId) {
      this.logger.warn(`No se encontró siguiente nodo para ${currentNode.id}`);
      return;
    }

    // Actualizar sesión
    session.currentNodeId = nextNodeId;
    this.sessions.set(chatId, session);

    // Ejecutar siguiente nodo
    await this.executeNode(chatId, nextNodeId);
  }

  /**
   * Ejecutar un nodo del flujo
   */
  private async executeNode(chatId: string, nodeId: string): Promise<void> {
    const node = await this.botNodeRepository.findOne({ where: { id: nodeId } });

    if (!node) {
      throw new NotFoundException(`Nodo ${nodeId} no encontrado`);
    }

    this.logger.log(`Ejecutando nodo ${node.name} (${node.type}) para chat ${chatId}`);

    switch (node.type) {
      case BotNodeType.MESSAGE:
        await this.executeMessageNode(chatId, node);
        break;

      case BotNodeType.MENU:
        await this.executeMenuNode(chatId, node);
        break;

      case BotNodeType.INPUT:
        await this.executeInputNode(chatId, node);
        break;

      case BotNodeType.CONDITION:
        await this.executeConditionNode(chatId, node);
        break;

      case BotNodeType.API_CALL:
        await this.executeApiCallNode(chatId, node);
        break;

      case BotNodeType.TRANSFER_AGENT:
        await this.executeTransferNode(chatId, node);
        break;

      case BotNodeType.END:
        await this.executeEndNode(chatId);
        break;

      default:
        this.logger.warn(`Tipo de nodo no soportado: ${node.type}`);
    }
  }

  /**
   * Ejecutar nodo de mensaje
   */
  private async executeMessageNode(chatId: string, node: BotNode): Promise<void> {
    const message = node.config.message;

    if (!message) {
      this.logger.warn('Nodo de mensaje sin contenido');
      return;
    }

    // Enviar mensaje
    await this.messagesService.create({
      chatId,
      type: MessageType.TEXT,
      direction: MessageDirection.OUTBOUND,
      senderType: MessageSenderType.BOT,
      content: this.replaceVariables(message, this.sessions.get(chatId)?.variables),
    });

    // Si hay siguiente nodo, continuar automáticamente
    if (node.nextNodeId) {
      const session = this.sessions.get(chatId);
      if (session) {
        session.currentNodeId = node.nextNodeId;
        this.sessions.set(chatId, session);
        await this.executeNode(chatId, node.nextNodeId);
      }
    }
  }

  /**
   * Ejecutar nodo de menú
   */
  private async executeMenuNode(chatId: string, node: BotNode): Promise<void> {
    const options = node.config.options || [];

    if (options.length === 0) {
      this.logger.warn('Nodo de menú sin opciones');
      return;
    }

    // Construir mensaje de menú
    const menuText = options
      .map((opt: any, index: number) => `${index + 1}. ${opt.label}`)
      .join('\n');

    await this.messagesService.create({
      chatId,
      type: MessageType.TEXT,
      direction: MessageDirection.OUTBOUND,
      senderType: MessageSenderType.BOT,
      content: menuText,
    });

    // Esperar respuesta del usuario (no continuar automáticamente)
  }

  /**
   * Ejecutar nodo de input
   */
  private async executeInputNode(chatId: string, node: BotNode): Promise<void> {
    const message = node.config.message || '¿Cuál es tu respuesta?';

    await this.messagesService.create({
      chatId,
      type: MessageType.TEXT,
      direction: MessageDirection.OUTBOUND,
      senderType: MessageSenderType.BOT,
      content: message,
    });

    // Esperar respuesta del usuario
  }

  /**
   * Ejecutar nodo de condición
   */
  private async executeConditionNode(chatId: string, node: BotNode): Promise<void> {
    const session = this.sessions.get(chatId);
    if (!session) return;

    const nextNodeId = this.handleCondition(node, session);

    if (nextNodeId) {
      session.currentNodeId = nextNodeId;
      this.sessions.set(chatId, session);
      await this.executeNode(chatId, nextNodeId);
    }
  }

  /**
   * Ejecutar nodo de llamada API
   */
  private async executeApiCallNode(chatId: string, node: BotNode): Promise<void> {
    // Implementación simplificada - en producción usar axios
    this.logger.log('Ejecutando llamada API (no implementado)');

    if (node.nextNodeId) {
      const session = this.sessions.get(chatId);
      if (session) {
        session.currentNodeId = node.nextNodeId;
        await this.executeNode(chatId, node.nextNodeId);
      }
    }
  }

  /**
   * Ejecutar nodo de transferencia a agente
   */
  private async executeTransferNode(chatId: string, node: BotNode): Promise<void> {
    this.logger.log(`Transfiriendo chat ${chatId} a agente humano`);

    await this.messagesService.create({
      chatId,
      type: MessageType.TEXT,
      direction: MessageDirection.OUTBOUND,
      senderType: MessageSenderType.BOT,
      content: 'Te estoy conectando con un agente. Por favor espera un momento...',
    });

    // Actualizar chat para asignación a agente
    await this.chatsService.update(chatId, {
      status: ChatStatus.WAITING,
      botContext: {
        ...this.sessions.get(chatId),
        transferredToAgent: true,
      },
    });

    // Limpiar sesión
    this.sessions.delete(chatId);
  }

  /**
   * Ejecutar nodo de fin
   */
  private async executeEndNode(chatId: string): Promise<void> {
    this.logger.log(`Finalizando flujo para chat ${chatId}`);

    await this.messagesService.create({
      chatId,
      type: MessageType.TEXT,
      direction: MessageDirection.OUTBOUND,
      senderType: MessageSenderType.BOT,
      content: '¡Gracias por tu tiempo! Si necesitas más ayuda, no dudes en escribirnos.',
    });

    // Cerrar chat
    await this.chatsService.update(chatId, {
      status: ChatStatus.RESOLVED,
    });

    // Limpiar sesión
    this.sessions.delete(chatId);
  }

  /**
   * Manejar input de menú
   */
  private handleMenuInput(node: BotNode, userInput: string): string | null {
    const options = node.config.options || [];
    const inputNum = parseInt(userInput.trim());

    if (isNaN(inputNum) || inputNum < 1 || inputNum > options.length) {
      return null; // Input inválido
    }

    return options[inputNum - 1].nextNodeId;
  }

  /**
   * Manejar input de texto
   */
  private async handleTextInput(
    node: BotNode,
    userInput: string,
    session: BotSession,
  ): Promise<string | null> {
    const variableName = node.config.variableName;
    const validation = node.config.validation;

    // Validar input
    if (validation) {
      if (validation.required && !userInput.trim()) {
        await this.messagesService.create({
          chatId: session.chatId,
          type: MessageType.TEXT,
          direction: MessageDirection.OUTBOUND,
          senderType: MessageSenderType.BOT,
          content: validation.errorMessage || 'Este campo es requerido',
        });
        return null;
      }

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(userInput)) {
          await this.messagesService.create({
            chatId: session.chatId,
            type: MessageType.TEXT,
            direction: MessageDirection.OUTBOUND,
            senderType: MessageSenderType.BOT,
            content: validation.errorMessage || 'Formato inválido',
          });
          return null;
        }
      }
    }

    // Guardar en variable
    if (variableName) {
      session.variables[variableName] = userInput;
    }

    return node.nextNodeId;
  }

  /**
   * Manejar condiciones
   */
  private handleCondition(node: BotNode, session: BotSession): string | null {
    const conditions = node.config.conditions || [];

    for (const condition of conditions) {
      const variableValue = session.variables[condition.variable];

      let matches = false;

      switch (condition.operator) {
        case 'equals':
          matches = variableValue === condition.value;
          break;
        case 'contains':
          matches = String(variableValue).includes(String(condition.value));
          break;
        case 'greater':
          matches = Number(variableValue) > Number(condition.value);
          break;
        case 'less':
          matches = Number(variableValue) < Number(condition.value);
          break;
      }

      if (matches) {
        return condition.nextNodeId;
      }
    }

    return node.nextNodeId; // Fallback
  }

  /**
   * Inicializar variables del flujo
   */
  private initializeVariables(flow: BotFlow): Record<string, any> {
    const variables: Record<string, any> = {};

    if (flow.variables) {
      Object.entries(flow.variables).forEach(([key, config]: [string, any]) => {
        variables[key] = config.defaultValue || null;
      });
    }

    return variables;
  }

  /**
   * Reemplazar variables en texto
   */
  private replaceVariables(text: string, variables?: Record<string, any>): string {
    if (!variables) return text;

    let result = text;

    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    return result;
  }

  /**
   * Limpiar sesiones inactivas
   */
  cleanInactiveSessions(maxInactivityMinutes: number = 30): void {
    const now = new Date();

    this.sessions.forEach((session, chatId) => {
      const inactiveMinutes =
        (now.getTime() - session.lastActivityAt.getTime()) / 1000 / 60;

      if (inactiveMinutes > maxInactivityMinutes) {
        this.logger.log(`Limpiando sesión inactiva: ${chatId}`);
        this.sessions.delete(chatId);
      }
    });
  }
}
