"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BotEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotEngineService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bot_flow_entity_1 = require("./entities/bot-flow.entity");
const bot_node_entity_1 = require("./entities/bot-node.entity");
const messages_service_1 = require("../messages/messages.service");
const chats_service_1 = require("../chats/chats.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const debtors_service_1 = require("../debtors/debtors.service");
const chat_entity_1 = require("../chats/entities/chat.entity");
const message_entity_1 = require("../messages/entities/message.entity");
let BotEngineService = BotEngineService_1 = class BotEngineService {
    constructor(botFlowRepository, botNodeRepository, messagesService, chatsService, whatsappService, debtorsService) {
        this.botFlowRepository = botFlowRepository;
        this.botNodeRepository = botNodeRepository;
        this.messagesService = messagesService;
        this.chatsService = chatsService;
        this.whatsappService = whatsappService;
        this.debtorsService = debtorsService;
        this.logger = new common_1.Logger(BotEngineService_1.name);
        this.sessions = new Map();
    }
    /**
     * Iniciar flujo de bot para un chat
     */
    async startFlow(chatId, flowId) {
        this.logger.log(`Iniciando flujo ${flowId} para chat ${chatId}`);
        const flow = await this.botFlowRepository.findOne({
            where: { id: flowId, status: bot_flow_entity_1.BotFlowStatus.ACTIVE },
            relations: ['nodes'],
        });
        if (!flow) {
            throw new common_1.NotFoundException(`Flujo de bot ${flowId} no encontrado o inactivo`);
        }
        if (!flow.startNodeId) {
            throw new Error('El flujo no tiene nodo inicial configurado');
        }
        // Obtener el chat con sus relaciones
        const chat = await this.chatsService.findOne(chatId);
        // Inicializar variables del flujo básicas
        const variables = this.initializeVariables(flow);
        // Agregar variables del chat
        variables['clientName'] = chat.contactName || 'Cliente';
        variables['clientPhone'] = chat.contactPhone;
        variables['debtorFound'] = false; // Se actualizará cuando proporcione documento
        // Crear sesión
        const session = {
            chatId,
            flowId,
            currentNodeId: flow.startNodeId,
            variables,
            createdAt: new Date(),
            lastActivityAt: new Date(),
        };
        this.sessions.set(chatId, session);
        // Actualizar chat
        await this.chatsService.update(chatId, {
            status: chat_entity_1.ChatStatus.BOT,
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
    async processUserInput(chatId, userInput) {
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
            throw new common_1.NotFoundException(`Nodo ${session.currentNodeId} no encontrado`);
        }
        // Procesar según tipo de nodo
        let nextNodeId = null;
        switch (currentNode.type) {
            case bot_node_entity_1.BotNodeType.MESSAGE:
                // Caso especial: mensaje con botones que espera respuesta
                if (currentNode.config.useButtons && currentNode.config.buttons) {
                    // Guardar respuesta del usuario
                    session.variables['user_response'] = userInput;
                    // Buscar el botón que coincida con la respuesta
                    const buttons = currentNode.config.buttons;
                    const inputLower = userInput.toLowerCase().trim();
                    const matchedButton = buttons.find((btn) => btn.id?.toLowerCase() === inputLower ||
                        btn.text?.toLowerCase() === inputLower ||
                        btn.value?.toLowerCase() === inputLower ||
                        btn.text?.toLowerCase().includes(inputLower) ||
                        inputLower.includes(btn.text?.toLowerCase() || ''));
                    if (matchedButton) {
                        session.variables['selected_button'] = matchedButton.id || matchedButton.value;
                        this.logger.log(`🔘 Botón seleccionado: ${matchedButton.text} (ID: ${matchedButton.id})`);
                    }
                    // Si hay responseNodeId (normalmente un CONDITION), usarlo
                    if (currentNode.config.responseNodeId) {
                        nextNodeId = currentNode.config.responseNodeId;
                    }
                    else {
                        nextNodeId = currentNode.nextNodeId;
                    }
                }
                else {
                    nextNodeId = currentNode.nextNodeId;
                }
                break;
            case bot_node_entity_1.BotNodeType.MENU:
                nextNodeId = this.handleMenuInput(currentNode, userInput);
                break;
            case bot_node_entity_1.BotNodeType.INPUT:
                nextNodeId = await this.handleTextInput(currentNode, userInput, session);
                break;
            case bot_node_entity_1.BotNodeType.CONDITION:
                // Guardar el input del usuario para que pueda ser evaluado por la condición
                session.variables['user_response'] = userInput;
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
        session.lastActivityAt = new Date();
        this.sessions.set(chatId, session);
        // Actualizar también el botContext en el chat
        await this.chatsService.update(chatId, {
            botContext: {
                ...session,
                sessionId: chatId,
            },
        });
        this.logger.log(`➡️ Procesando respuesta, avanzando a nodo: ${nextNodeId}`);
        // Ejecutar siguiente nodo
        await this.executeNode(chatId, nextNodeId);
    }
    /**
     * Ejecutar un nodo del flujo
     */
    async executeNode(chatId, nodeId) {
        const node = await this.botNodeRepository.findOne({ where: { id: nodeId } });
        if (!node) {
            throw new common_1.NotFoundException(`Nodo ${nodeId} no encontrado`);
        }
        this.logger.log(`Ejecutando nodo ${node.name} (${node.type}) para chat ${chatId}`);
        switch (node.type) {
            case bot_node_entity_1.BotNodeType.MESSAGE:
                await this.executeMessageNode(chatId, node);
                break;
            case bot_node_entity_1.BotNodeType.MENU:
                await this.executeMenuNode(chatId, node);
                break;
            case bot_node_entity_1.BotNodeType.INPUT:
                await this.executeInputNode(chatId, node);
                break;
            case bot_node_entity_1.BotNodeType.CONDITION:
                // Los nodos CONDITION no se ejecutan automáticamente
                // Solo se procesan cuando llega input del usuario en processUserInput()
                this.logger.log(`⏸️ Nodo CONDITION alcanzado. Esperando respuesta del usuario...`);
                break;
            case bot_node_entity_1.BotNodeType.API_CALL:
                await this.executeApiCallNode(chatId, node);
                break;
            case bot_node_entity_1.BotNodeType.TRANSFER_AGENT:
                await this.executeTransferNode(chatId, node);
                break;
            case bot_node_entity_1.BotNodeType.END:
                await this.executeEndNode(chatId);
                break;
            default:
                this.logger.warn(`Tipo de nodo no soportado: ${node.type}`);
        }
    }
    /**
     * Ejecutar nodo de mensaje
     */
    async executeMessageNode(chatId, node) {
        const message = node.config.message;
        if (!message) {
            this.logger.warn('Nodo de mensaje sin contenido');
            return;
        }
        const chat = await this.chatsService.findOne(chatId);
        const processedMessage = this.replaceVariables(message, this.sessions.get(chatId)?.variables);
        try {
            let result;
            let savedContent = processedMessage;
            // Verificar si debe usar botones interactivos
            if (node.config.useButtons && node.config.buttons && node.config.buttons.length > 0) {
                const buttons = node.config.buttons.map(btn => ({
                    id: btn.id,
                    text: btn.text,
                }));
                const title = node.config.buttonTitle || 'Seleccione una opción';
                this.logger.log(`📤 Enviando mensaje con botones: ${buttons.length} botones`);
                result = await this.whatsappService.sendButtonsMessage(chat.whatsappNumber.id, chat.contactPhone, title, processedMessage, buttons);
                // Guardar el contenido con indicación de botones
                savedContent = `${processedMessage}\n\n[Botones: ${buttons.map(b => b.text).join(' | ')}]`;
            }
            else {
                // Enviar mensaje de texto normal
                result = await this.whatsappService.sendMessage(chat.whatsappNumber.id, chat.contactPhone, processedMessage, message_entity_1.MessageType.TEXT);
            }
            // Crear registro del mensaje como BOT
            const savedMessage = await this.messagesService.create({
                chatId,
                type: message_entity_1.MessageType.TEXT,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.BOT,
                content: savedContent,
                externalId: result.messageId,
            });
            // Actualizar estado a enviado
            await this.messagesService.updateStatus(savedMessage.id, message_entity_1.MessageStatus.SENT);
            this.logger.log(`Bot envió mensaje a ${chat.contactPhone}: "${processedMessage.substring(0, 50)}..."`);
        }
        catch (error) {
            this.logger.error(`Error enviando mensaje del bot: ${error.message}`);
            // Crear registro del mensaje con estado pendiente
            const savedMessage = await this.messagesService.create({
                chatId,
                type: message_entity_1.MessageType.TEXT,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.BOT,
                content: processedMessage,
            });
            // Marcar como fallido
            await this.messagesService.updateStatus(savedMessage.id, message_entity_1.MessageStatus.FAILED, error.message);
        }
        // Si el mensaje tiene botones con responseNodeId, esperar respuesta del usuario
        // y configurar el nodo de respuesta para procesar el input
        if (node.config.useButtons && node.config.responseNodeId) {
            const session = this.sessions.get(chatId);
            if (session) {
                // El siguiente nodo a procesar será el responseNodeId (normalmente un CONDITION)
                session.currentNodeId = node.config.responseNodeId;
                session.lastActivityAt = new Date();
                this.sessions.set(chatId, session);
                // Actualizar el botContext en el chat
                await this.chatsService.update(chatId, {
                    botContext: {
                        ...session,
                        sessionId: chatId,
                    },
                });
                this.logger.log(`🔘 Mensaje con botones enviado. Esperando respuesta del usuario...`);
                this.logger.log(`📍 Próximo nodo a procesar (responseNodeId): ${node.config.responseNodeId}`);
            }
            return; // NO avanzar automáticamente, esperar respuesta del usuario
        }
        // Si hay siguiente nodo y NO son botones con respuesta, continuar automáticamente
        if (node.nextNodeId) {
            const session = this.sessions.get(chatId);
            if (session) {
                session.currentNodeId = node.nextNodeId;
                session.lastActivityAt = new Date();
                this.sessions.set(chatId, session);
                // Actualizar también el botContext en el chat
                await this.chatsService.update(chatId, {
                    botContext: {
                        ...session,
                        sessionId: chatId,
                    },
                });
                this.logger.log(`⏭️ Avanzando automáticamente al nodo: ${node.nextNodeId}`);
                await this.executeNode(chatId, node.nextNodeId);
            }
        }
    }
    /**
     * Ejecutar nodo de menú
     */
    async executeMenuNode(chatId, node) {
        const options = node.config.options || [];
        if (options.length === 0) {
            this.logger.warn('Nodo de menú sin opciones');
            return;
        }
        const chat = await this.chatsService.findOne(chatId);
        const session = this.sessions.get(chatId);
        try {
            let result;
            let savedContent;
            // Verificar si debe usar botones interactivos (máximo 3 botones en WhatsApp)
            if (options.length <= 3) {
                // Usar botones para 3 opciones o menos
                const buttons = options.map((opt) => ({
                    id: opt.id || opt.value,
                    text: opt.label.substring(0, 20), // WhatsApp limita a 20 caracteres
                }));
                const title = node.config.buttonTitle || 'Menú de opciones';
                const description = node.config.message || 'Por favor seleccione una opción:';
                const processedDesc = this.replaceVariables(description, session?.variables);
                this.logger.log(`📤 Enviando menú con ${buttons.length} botones`);
                result = await this.whatsappService.sendButtonsMessage(chat.whatsappNumber.id, chat.contactPhone, title, processedDesc, buttons);
                savedContent = `${processedDesc}\n\n[Botones: ${buttons.map(b => b.text).join(' | ')}]`;
            }
            else {
                // Para más de 3 opciones, usar lista
                const rows = options.map((opt) => ({
                    id: opt.id || opt.value,
                    title: opt.label.substring(0, 24), // WhatsApp limita a 24 caracteres
                    description: opt.description || '',
                }));
                const title = node.config.buttonTitle || 'Menú de opciones';
                const description = node.config.message || 'Por favor seleccione una opción:';
                const processedDesc = this.replaceVariables(description, session?.variables);
                this.logger.log(`📤 Enviando menú como lista con ${rows.length} opciones`);
                result = await this.whatsappService.sendListMessage(chat.whatsappNumber.id, chat.contactPhone, title, processedDesc, 'Ver opciones', [{ title: 'Opciones', rows }]);
                savedContent = `${processedDesc}\n\n[Lista: ${rows.map(r => r.title).join(' | ')}]`;
            }
            // Crear registro del mensaje como BOT
            const savedMessage = await this.messagesService.create({
                chatId,
                type: message_entity_1.MessageType.TEXT,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.BOT,
                content: savedContent,
                externalId: result?.messageId,
            });
            await this.messagesService.updateStatus(savedMessage.id, message_entity_1.MessageStatus.SENT);
            this.logger.log(`✅ Menú enviado exitosamente`);
        }
        catch (error) {
            this.logger.error(`Error enviando menú: ${error.message}`);
            // Fallback: enviar como texto plano
            const menuText = options
                .map((opt, index) => `${index + 1}. ${opt.label}`)
                .join('\n');
            try {
                await this.whatsappService.sendMessage(chat.whatsappNumber.id, chat.contactPhone, menuText, message_entity_1.MessageType.TEXT);
                await this.messagesService.create({
                    chatId,
                    type: message_entity_1.MessageType.TEXT,
                    direction: message_entity_1.MessageDirection.OUTBOUND,
                    senderType: message_entity_1.MessageSenderType.BOT,
                    content: menuText,
                });
            }
            catch (fallbackError) {
                this.logger.error(`Error en fallback de menú: ${fallbackError.message}`);
            }
        }
        // Esperar respuesta del usuario (no continuar automáticamente)
    }
    /**
     * Ejecutar nodo de input
     */
    async executeInputNode(chatId, node) {
        const message = node.config.message || '¿Cuál es tu respuesta?';
        const chat = await this.chatsService.findOne(chatId);
        const session = this.sessions.get(chatId);
        const processedMessage = this.replaceVariables(message, session?.variables);
        try {
            let result;
            let savedContent = processedMessage;
            // Verificar si debe usar botones interactivos
            if (node.config.useButtons && node.config.buttons && node.config.buttons.length > 0) {
                const buttons = node.config.buttons.map(btn => ({
                    id: btn.id,
                    text: btn.text,
                }));
                const title = node.config.buttonTitle || 'Responda';
                this.logger.log(`📤 Enviando input con botones: ${buttons.length} botones`);
                result = await this.whatsappService.sendButtonsMessage(chat.whatsappNumber.id, chat.contactPhone, title, processedMessage, buttons);
                savedContent = `${processedMessage}\n\n[Botones: ${buttons.map(b => b.text).join(' | ')}]`;
            }
            else {
                // Enviar mensaje de texto normal
                result = await this.whatsappService.sendMessage(chat.whatsappNumber.id, chat.contactPhone, processedMessage, message_entity_1.MessageType.TEXT);
            }
            // Crear registro del mensaje como BOT
            const savedMessage = await this.messagesService.create({
                chatId,
                type: message_entity_1.MessageType.TEXT,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.BOT,
                content: savedContent,
                externalId: result?.messageId,
            });
            await this.messagesService.updateStatus(savedMessage.id, message_entity_1.MessageStatus.SENT);
            this.logger.log(`📝 Bot solicitó input: "${processedMessage.substring(0, 50)}..."`);
        }
        catch (error) {
            this.logger.error(`Error enviando solicitud de input: ${error.message}`);
        }
        // Esperar respuesta del usuario - no avanzar automáticamente
        this.logger.log(`⏸️ Nodo INPUT alcanzado. Esperando respuesta del usuario...`);
    }
    /**
     * Ejecutar nodo de condición
     */
    async executeConditionNode(chatId, node) {
        const session = this.sessions.get(chatId);
        if (!session)
            return;
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
    async executeApiCallNode(chatId, node) {
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
    async executeTransferNode(chatId, node) {
        this.logger.log(`Transfiriendo chat ${chatId} a agente humano`);
        const message = node.config.message || 'Perfecto, en un momento uno de nuestros asesores será asignado a tu caso para ayudarte con tu solicitud. ⏳\n\nPor favor espera un momento mientras te conectamos con un especialista.';
        const chat = await this.chatsService.findOne(chatId);
        const session = this.sessions.get(chatId);
        const processedMessage = this.replaceVariables(message, session?.variables);
        try {
            // Enviar mensaje de transferencia por WhatsApp
            const result = await this.whatsappService.sendMessage(chat.whatsappNumber.id, chat.contactPhone, processedMessage, message_entity_1.MessageType.TEXT);
            const savedMessage = await this.messagesService.create({
                chatId,
                type: message_entity_1.MessageType.TEXT,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.BOT,
                content: processedMessage,
                externalId: result.messageId,
            });
            await this.messagesService.updateStatus(savedMessage.id, message_entity_1.MessageStatus.SENT);
            this.logger.log(`📤 Mensaje de transferencia enviado a ${chat.contactPhone}`);
        }
        catch (error) {
            this.logger.error(`Error enviando mensaje de transferencia: ${error.message}`);
        }
        // Actualizar chat a estado ACTIVE (esperando asignación)
        await this.chatsService.update(chatId, {
            status: chat_entity_1.ChatStatus.ACTIVE,
            botContext: {
                ...session,
                transferredToAgent: true,
            },
        });
        this.logger.log(`✅ Chat ${chatId} transferido a estado ACTIVE - Esperando asignación de asesor`);
        // Limpiar sesión del bot
        this.sessions.delete(chatId);
    }
    /**
     * Ejecutar nodo de fin
     */
    async executeEndNode(chatId) {
        this.logger.log(`Finalizando flujo para chat ${chatId}`);
        await this.messagesService.create({
            chatId,
            type: message_entity_1.MessageType.TEXT,
            direction: message_entity_1.MessageDirection.OUTBOUND,
            senderType: message_entity_1.MessageSenderType.BOT,
            content: '¡Gracias por tu tiempo! Si necesitas más ayuda, no dudes en escribirnos.',
        });
        // Cerrar chat
        await this.chatsService.update(chatId, {
            status: chat_entity_1.ChatStatus.RESOLVED,
        });
        // Limpiar sesión
        this.sessions.delete(chatId);
    }
    /**
     * Manejar input de menú
     */
    handleMenuInput(node, userInput) {
        const options = node.config.options || [];
        const inputTrimmed = userInput.trim().toLowerCase();
        const inputNum = parseInt(inputTrimmed);
        // 1. Buscar por número (1, 2, 3...)
        if (!isNaN(inputNum) && inputNum >= 1 && inputNum <= options.length) {
            this.logger.log(`🎯 Menú: seleccionado por número ${inputNum}`);
            return options[inputNum - 1].nextNodeId;
        }
        // 2. Buscar por ID del botón (para botones interactivos)
        const matchById = options.find((opt) => (opt.id && opt.id.toLowerCase() === inputTrimmed) ||
            (opt.value && opt.value.toLowerCase() === inputTrimmed));
        if (matchById) {
            this.logger.log(`🎯 Menú: seleccionado por ID "${inputTrimmed}"`);
            return matchById.nextNodeId;
        }
        // 3. Buscar por texto del label (para respuestas de texto que coincidan)
        const matchByLabel = options.find((opt) => opt.label && opt.label.toLowerCase() === inputTrimmed);
        if (matchByLabel) {
            this.logger.log(`🎯 Menú: seleccionado por label "${inputTrimmed}"`);
            return matchByLabel.nextNodeId;
        }
        // 4. Buscar por coincidencia parcial en label
        const matchByPartialLabel = options.find((opt) => opt.label && opt.label.toLowerCase().includes(inputTrimmed));
        if (matchByPartialLabel) {
            this.logger.log(`🎯 Menú: seleccionado por coincidencia parcial "${inputTrimmed}"`);
            return matchByPartialLabel.nextNodeId;
        }
        this.logger.warn(`⚠️ Menú: entrada "${inputTrimmed}" no coincide con ninguna opción`);
        return null; // Input inválido
    }
    /**
     * Manejar input de texto
     */
    async handleTextInput(node, userInput, session) {
        const variableName = node.config.variableName;
        const validation = node.config.validation;
        // Validar input
        if (validation) {
            if (validation.required && !userInput.trim()) {
                await this.messagesService.create({
                    chatId: session.chatId,
                    type: message_entity_1.MessageType.TEXT,
                    direction: message_entity_1.MessageDirection.OUTBOUND,
                    senderType: message_entity_1.MessageSenderType.BOT,
                    content: validation.errorMessage || 'Este campo es requerido',
                });
                return null;
            }
            if (validation.pattern) {
                const regex = new RegExp(validation.pattern);
                if (!regex.test(userInput)) {
                    await this.messagesService.create({
                        chatId: session.chatId,
                        type: message_entity_1.MessageType.TEXT,
                        direction: message_entity_1.MessageDirection.OUTBOUND,
                        senderType: message_entity_1.MessageSenderType.BOT,
                        content: validation.errorMessage || 'Formato inválido',
                    });
                    return null;
                }
            }
        }
        // Guardar en variable
        if (variableName) {
            session.variables[variableName] = userInput;
            // Si capturamos un documento, buscar automáticamente al deudor
            if (variableName === 'documento_validado' || variableName === 'documentNumber') {
                this.logger.log(`🔍 Capturado documento: ${userInput}, buscando deudor...`);
                // Limpiar el documento (remover puntos, guiones, espacios)
                const cleanDocument = userInput.replace(/[.\-\s]/g, '');
                // Buscar deudor por documento (asumiendo CC por defecto, puede mejorarse)
                const debtor = await this.debtorsService.findByDocument('CC', cleanDocument);
                if (debtor) {
                    // Crear objeto anidado para que replaceVariables funcione correctamente
                    session.variables.debtor = {
                        fullName: debtor.fullName,
                        documentType: debtor.documentType,
                        documentNumber: debtor.documentNumber,
                        phone: debtor.phone,
                        email: debtor.email || '[No disponible]',
                        debtAmount: debtor.debtAmount,
                        initialDebtAmount: debtor.initialDebtAmount,
                        daysOverdue: debtor.daysOverdue,
                        status: debtor.status,
                        lastPaymentDate: '[No disponible]',
                        producto: '[No disponible]',
                        numeroCredito: '[No disponible]',
                        fechaVencimiento: '[No disponible]',
                    };
                    // Manejar fecha de pago (puede ser Date, string o null)
                    if (debtor.lastPaymentDate) {
                        const paymentDate = debtor.lastPaymentDate;
                        if (paymentDate instanceof Date) {
                            session.variables.debtor.lastPaymentDate = paymentDate.toISOString().split('T')[0];
                        }
                        else if (typeof paymentDate === 'string') {
                            session.variables.debtor.lastPaymentDate = paymentDate.split('T')[0];
                        }
                    }
                    // Metadata adicional
                    if (debtor.metadata) {
                        session.variables.debtor.producto = debtor.metadata.producto || '[No disponible]';
                        session.variables.debtor.numeroCredito = debtor.metadata.numeroCredito || '[No disponible]';
                        session.variables.debtor.fechaVencimiento = debtor.metadata.fechaVencimiento || '[No disponible]';
                    }
                    session.variables.debtorFound = true;
                    this.logger.log(`✅ Deudor encontrado: ${debtor.fullName} - CC ${debtor.documentNumber} - Deuda: $${debtor.debtAmount}`);
                    // Actualizar el chat con el deudor y su campaña
                    try {
                        const updateData = { debtorId: debtor.id };
                        // Si el deudor tiene una campaña asignada, también actualizar la campaña del chat
                        if (debtor.campaignId) {
                            updateData.campaignId = debtor.campaignId;
                            this.logger.log(`🔄 Actualizando chat con deudor ${debtor.fullName} y campaña ${debtor.campaignId}`);
                        }
                        else {
                            this.logger.log(`🔄 Actualizando chat con deudor ${debtor.fullName}`);
                        }
                        await this.chatsService.update(session.chatId, updateData);
                    }
                    catch (error) {
                        this.logger.error(`Error actualizando chat con información del deudor: ${error.message}`);
                    }
                    // Actualizar última fecha de contacto
                    await this.debtorsService.updateLastContacted(debtor.id);
                }
                else {
                    this.logger.warn(`❌ No se encontró deudor con documento: ${cleanDocument}`);
                    session.variables['debtorFound'] = false;
                }
            }
        }
        return node.nextNodeId;
    }
    /**
     * Manejar condiciones
     */
    handleCondition(node, session) {
        const conditions = node.config.conditions || [];
        this.logger.log(`🔍 Evaluando condición en nodo: ${node.name}`);
        this.logger.log(`   Variables disponibles:`, session.variables);
        // Obtener la respuesta del usuario (guardada en user_response)
        const userResponse = session.variables['user_response'];
        this.logger.log(`   Respuesta del usuario: "${userResponse}"`);
        for (const condition of conditions) {
            // Cada condición puede tener su propia variable O usar user_response
            const variableName = condition.variable || 'user_response';
            const variableValue = session.variables[variableName] || userResponse;
            this.logger.log(`   Evaluando: "${variableValue}" ${condition.operator} "${condition.value}"`);
            let matches = false;
            switch (condition.operator) {
                case 'equals':
                    // Comparar ignorando mayúsculas/minúsculas y espacios
                    const normalizedValue = String(variableValue || '').toLowerCase().trim();
                    const normalizedCondition = String(condition.value || '').toLowerCase().trim();
                    matches = normalizedValue === normalizedCondition;
                    break;
                case 'contains':
                    matches = String(variableValue || '').includes(String(condition.value || ''));
                    break;
                case 'contains_ignore_case':
                    matches = String(variableValue || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
                    break;
                case 'greater':
                    matches = Number(variableValue) > Number(condition.value);
                    break;
                case 'less':
                    matches = Number(variableValue) < Number(condition.value);
                    break;
            }
            if (matches) {
                // Usar targetNodeId (de la configuración real) o nextNodeId
                const nextNode = condition.targetNodeId || condition.nextNodeId;
                this.logger.log(`   ✅ Match encontrado! Siguiente nodo: ${nextNode}`);
                return nextNode;
            }
        }
        // Usar defaultNodeId, elseNodeId o nextNodeId como fallback
        const fallbackNodeId = node.config.defaultNodeId || node.config.elseNodeId || node.nextNodeId;
        this.logger.log(`   ❌ Ninguna condición match. Usando fallback: ${fallbackNodeId}`);
        return fallbackNodeId;
    }
    /**
     * Inicializar variables del flujo
     */
    initializeVariables(flow) {
        const variables = {};
        if (flow.variables) {
            Object.entries(flow.variables).forEach(([key, config]) => {
                variables[key] = config.defaultValue || null;
            });
        }
        return variables;
    }
    /**
     * Reemplazar variables en texto
     */
    replaceVariables(text, variables) {
        if (!variables) {
            // Si no hay variables, reemplazar todos los placeholders con texto informativo
            return text.replace(/\{\{([^}]+)\}\}/g, '[No disponible]');
        }
        let result = text;
        // Reemplazar variables con rutas anidadas (ej: {{debtor.fullName}}, {{debtor.metadata.producto}})
        const regex = /\{\{([^}]+)\}\}/g;
        result = result.replace(regex, (match, path) => {
            const keys = path.split('.');
            let value = variables;
            // Navegar por la ruta de propiedades
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                }
                else {
                    // Si no se encuentra la ruta, retornar texto informativo
                    return '[No disponible]';
                }
            }
            // Formatear valores especiales
            if (typeof value === 'number') {
                // Formatear números grandes como moneda
                if (value >= 1000) {
                    return value.toLocaleString('es-CO');
                }
            }
            return value != null ? String(value) : '[No disponible]';
        });
        return result;
    }
    /**
     * Verificar si hay una sesión activa para un chat
     */
    hasActiveSession(chatId) {
        return this.sessions.has(chatId);
    }
    /**
     * Limpiar sesiones inactivas
     */
    cleanInactiveSessions(maxInactivityMinutes = 30) {
        const now = new Date();
        this.sessions.forEach((session, chatId) => {
            const inactiveMinutes = (now.getTime() - session.lastActivityAt.getTime()) / 1000 / 60;
            if (inactiveMinutes > maxInactivityMinutes) {
                this.logger.log(`Limpiando sesión inactiva: ${chatId}`);
                this.sessions.delete(chatId);
            }
        });
    }
};
exports.BotEngineService = BotEngineService;
exports.BotEngineService = BotEngineService = BotEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bot_flow_entity_1.BotFlow)),
    __param(1, (0, typeorm_1.InjectRepository)(bot_node_entity_1.BotNode)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        messages_service_1.MessagesService,
        chats_service_1.ChatsService,
        whatsapp_service_1.WhatsappService,
        debtors_service_1.DebtorsService])
], BotEngineService);
