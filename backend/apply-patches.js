/**
 * Parche para agregar métodos de botones al código compilado
 */
const fs = require('fs');

const BASE = '/var/www/crm-ngso-whatsapp/backend/dist/modules';

// 1. Parchear wppconnect.service.js
console.log('=== Parcheando wppconnect.service.js ===');
const wppFile = `${BASE}/whatsapp/providers/wppconnect.service.js`;
let wppContent = fs.readFileSync(wppFile, 'utf8');

if (!wppContent.includes('sendButtonsMessage')) {
  // Encontrar donde insertar (antes del cierre de la clase)
  const insertCode = `
    async sendButtonsMessage(sessionName, to, title, description, buttons) {
        const client = this.clients.get(sessionName);
        if (!client) {
            throw new Error('Sesion ' + sessionName + ' no encontrada');
        }
        try {
            this.logger.log('Enviando mensaje con botones a ' + to);
            // WPPConnect: enviar como texto con opciones numeradas como fallback
            const btnText = buttons.map((b, i) => (i + 1) + '. ' + b.text).join('\\n');
            const fullMsg = description + '\\n\\n' + btnText;
            const result = await client.sendText(to, fullMsg);
            return result;
        } catch (error) {
            this.logger.error('Error enviando botones: ' + error.message);
            throw error;
        }
    }
    async sendListMessage(sessionName, to, title, description, buttonText, sections) {
        const client = this.clients.get(sessionName);
        if (!client) {
            throw new Error('Sesion ' + sessionName + ' no encontrada');
        }
        try {
            this.logger.log('Enviando lista a ' + to);
            const rows = sections.flatMap(s => s.rows);
            const listText = rows.map((r, i) => (i + 1) + '. ' + r.title).join('\\n');
            const fullMsg = description + '\\n\\n' + listText;
            const result = await client.sendText(to, fullMsg);
            return result;
        } catch (error) {
            this.logger.error('Error enviando lista: ' + error.message);
            throw error;
        }
    }
`;
  
  // Buscar el ultimo exports o el final de la clase
  const classEnd = wppContent.lastIndexOf('exports.WppConnectService');
  if (classEnd > -1) {
    // Insertar antes de la linea de exports
    const insertPos = wppContent.lastIndexOf('};', classEnd);
    if (insertPos > -1) {
      wppContent = wppContent.slice(0, insertPos) + insertCode + wppContent.slice(insertPos);
      fs.writeFileSync(wppFile, wppContent);
      console.log('OK - Metodos de botones agregados a wppconnect.service.js');
    }
  }
} else {
  console.log('Los metodos ya existen en wppconnect.service.js');
}

// 2. Parchear whatsapp.service.js
console.log('\n=== Parcheando whatsapp.service.js ===');
const wsFile = `${BASE}/whatsapp/whatsapp.service.js`;
let wsContent = fs.readFileSync(wsFile, 'utf8');

if (!wsContent.includes('sendButtonsMessage')) {
  const insertCode = `
    async sendButtonsMessage(whatsappNumberId, to, title, description, buttons) {
        const whatsappNumber = await this.findOne(whatsappNumberId);
        const sessionName = whatsappNumber.phoneNumber;
        const formattedTo = to.includes('@') ? to : to + '@c.us';
        this.logger.log('Enviando botones via WPPConnect - To: ' + formattedTo);
        try {
            const result = await this.wppConnectService.sendButtonsMessage(sessionName, formattedTo, title, description, buttons);
            return { messageId: (result && result.id) || ('wpp-btn-' + Date.now()), metadata: result };
        } catch (error) {
            this.logger.error('Error enviando botones: ' + error.message);
            throw error;
        }
    }
    async sendListMessage(whatsappNumberId, to, title, description, buttonText, sections) {
        const whatsappNumber = await this.findOne(whatsappNumberId);
        const sessionName = whatsappNumber.phoneNumber;
        const formattedTo = to.includes('@') ? to : to + '@c.us';
        this.logger.log('Enviando lista via WPPConnect - To: ' + formattedTo);
        try {
            const result = await this.wppConnectService.sendListMessage(sessionName, formattedTo, title, description, buttonText, sections);
            return { messageId: (result && result.id) || ('wpp-list-' + Date.now()), metadata: result };
        } catch (error) {
            this.logger.error('Error enviando lista: ' + error.message);
            throw error;
        }
    }
`;
  
  const classEnd = wsContent.lastIndexOf('exports.WhatsappService');
  if (classEnd > -1) {
    const insertPos = wsContent.lastIndexOf('};', classEnd);
    if (insertPos > -1) {
      wsContent = wsContent.slice(0, insertPos) + insertCode + wsContent.slice(insertPos);
      fs.writeFileSync(wsFile, wsContent);
      console.log('OK - Metodos de botones agregados a whatsapp.service.js');
    }
  }
} else {
  console.log('Los metodos ya existen en whatsapp.service.js');
}

// 3. Parchear bot-engine.service.js - executeMessageNode
console.log('\n=== Parcheando bot-engine.service.js ===');
const botFile = `${BASE}/bot/bot-engine.service.js`;
let botContent = fs.readFileSync(botFile, 'utf8');

// Verificar si ya tiene soporte para botones en executeMessageNode
if (!botContent.includes('useButtons') && !botContent.includes('sendButtonsMessage')) {
  // Buscar el metodo executeMessageNode
  const methodStart = botContent.indexOf('async executeMessageNode(');
  if (methodStart > -1) {
    // Buscar donde se hace el sendMessage y agregar verificacion de botones
    // Este es un parche mas complejo, mejor reemplazar todo el metodo
    
    // Buscar el final del metodo
    let braceCount = 0;
    let methodEnd = methodStart;
    let inMethod = false;
    
    for (let i = methodStart; i < botContent.length; i++) {
      if (botContent[i] === '{') {
        braceCount++;
        inMethod = true;
      } else if (botContent[i] === '}') {
        braceCount--;
        if (inMethod && braceCount === 0) {
          methodEnd = i + 1;
          break;
        }
      }
    }
    
    // Extraer el metodo actual
    const oldMethod = botContent.substring(methodStart, methodEnd);
    
    // Nuevo metodo con soporte para botones
    const newMethod = `async executeMessageNode(chatId, node) {
        const message = node.config.message;
        if (!message) {
            this.logger.warn('Nodo de mensaje sin contenido');
            return;
        }
        const chat = await this.chatsService.findOne(chatId);
        const session = this.sessions.get(chatId);
        const processedMessage = this.replaceVariables(message, session ? session.variables : {});
        try {
            let result;
            let savedContent = processedMessage;
            // Verificar si debe usar botones interactivos
            if (node.config.useButtons && node.config.buttons && node.config.buttons.length > 0) {
                const buttons = node.config.buttons.map(btn => ({
                    id: btn.id,
                    text: btn.text,
                }));
                const title = node.config.buttonTitle || 'Seleccione una opcion';
                this.logger.log('Enviando mensaje con botones: ' + buttons.length + ' botones');
                result = await this.whatsappService.sendButtonsMessage(
                    chat.whatsappNumber.id,
                    chat.contactPhone,
                    title,
                    processedMessage,
                    buttons
                );
                savedContent = processedMessage + '\\n\\n[Botones: ' + buttons.map(b => b.text).join(' | ') + ']';
            } else {
                result = await this.whatsappService.sendMessage(
                    chat.whatsappNumber.id,
                    chat.contactPhone,
                    processedMessage,
                    message_entity_1.MessageType.TEXT
                );
            }
            const savedMessage = await this.messagesService.create({
                chatId,
                type: message_entity_1.MessageType.TEXT,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.BOT,
                content: savedContent,
                externalId: result.messageId,
            });
            await this.messagesService.updateStatus(savedMessage.id, message_entity_1.MessageStatus.SENT);
            this.logger.log('Bot envio mensaje a ' + chat.contactPhone + ': ' + processedMessage.substring(0, 50) + '...');
        } catch (error) {
            this.logger.error('Error enviando mensaje del bot: ' + error.message);
            const savedMessage = await this.messagesService.create({
                chatId,
                type: message_entity_1.MessageType.TEXT,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.BOT,
                content: processedMessage,
            });
            await this.messagesService.updateStatus(savedMessage.id, message_entity_1.MessageStatus.FAILED, error.message);
        }
        if (node.nextNodeId) {
            const session = this.sessions.get(chatId);
            if (session) {
                session.currentNodeId = node.nextNodeId;
                session.lastActivityAt = new Date();
                this.sessions.set(chatId, session);
                await this.chatsService.update(chatId, {
                    botContext: Object.assign(Object.assign({}, session), { sessionId: chatId }),
                });
                this.logger.log('Avanzando automaticamente al nodo: ' + node.nextNodeId);
                await this.executeNode(chatId, node.nextNodeId);
            }
        }
    }`;
    
    botContent = botContent.replace(oldMethod, newMethod);
    fs.writeFileSync(botFile, botContent);
    console.log('OK - executeMessageNode actualizado con soporte de botones');
  }
} else {
  console.log('El soporte de botones ya existe en bot-engine.service.js');
}

console.log('\n=== Parches completados ===');
