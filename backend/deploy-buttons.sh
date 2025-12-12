#!/bin/bash
# Script de despliegue de actualización de botones interactivos

echo "====================================="
echo "Desplegando actualizaciones del bot"
echo "====================================="

cd /var/www/crm-ngso-whatsapp/backend

# 1. Crear script de actualización de nodos
cat > /tmp/update-bot-buttons.js << 'ENDSCRIPT'
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!',
});

async function updateNodeWithButtons() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // 1. Buscar nodos INPUT que tienen preguntas de sí/no
    const inputNodes = await client.query(`
      SELECT id, name, type, config 
      FROM bot_nodes 
      WHERE type = 'input'
        AND (
          config->>'message' ILIKE '%autoriza%'
          OR config->>'message' ILIKE '%acepta%'
          OR config->>'message' ILIKE '%sí o no%'
          OR config->>'message' ILIKE '%si o no%'
        )
    `);

    console.log('\n📋 Nodos INPUT con preguntas sí/no: ' + inputNodes.rows.length);
    
    for (const node of inputNodes.rows) {
      console.log('\n🔧 Actualizando: ' + node.name);
      
      const newConfig = {
        ...node.config,
        useButtons: true,
        buttonTitle: 'Responda',
        buttons: [
          { id: 'si', text: 'Sí, acepto', value: 'si' },
          { id: 'no', text: 'No acepto', value: 'no' }
        ]
      };

      await client.query(
        'UPDATE bot_nodes SET config = $1 WHERE id = $2',
        [JSON.stringify(newConfig), node.id]
      );
      console.log('✅ Actualizado');
    }

    // 2. Buscar nodos MESSAGE que tienen preguntas de sí/no
    const messageNodes = await client.query(`
      SELECT id, name, type, config 
      FROM bot_nodes 
      WHERE type = 'message'
        AND (
          config->>'message' ILIKE '%autoriza%'
          OR config->>'message' ILIKE '%acepta%'
          OR config->>'message' ILIKE '%escriba sí%'
          OR config->>'message' ILIKE '%escriba si%'
          OR config->>'message' ILIKE '%responda sí%'
          OR config->>'message' ILIKE '%responda si%'
        )
    `);

    console.log('\n📋 Nodos MESSAGE con preguntas: ' + messageNodes.rows.length);
    
    for (const node of messageNodes.rows) {
      console.log('\n🔧 Actualizando: ' + node.name);
      
      // Limpiar el mensaje de instrucciones de texto
      let message = node.config.message || '';
      message = message.replace(/\s*Escriba "Sí" para aceptar o "No" para rechazar\.?/gi, '');
      message = message.replace(/\s*Responda "Sí" o "No"\.?/gi, '');
      message = message.replace(/\s*\(Sí\/No\)\.?/gi, '');
      
      const newConfig = {
        ...node.config,
        message: message.trim(),
        useButtons: true,
        buttonTitle: 'Autorización de datos',
        buttons: [
          { id: 'si', text: 'Sí, acepto', value: 'si' },
          { id: 'no', text: 'No acepto', value: 'no' }
        ]
      };

      await client.query(
        'UPDATE bot_nodes SET config = $1 WHERE id = $2',
        [JSON.stringify(newConfig), node.id]
      );
      console.log('✅ Actualizado');
    }

    // 3. Mostrar nodos CONDITION para verificar
    const conditionNodes = await client.query(`
      SELECT id, name, config FROM bot_nodes WHERE type = 'condition'
    `);
    
    console.log('\n📋 Nodos CONDITION existentes: ' + conditionNodes.rows.length);
    conditionNodes.rows.forEach(n => {
      console.log('  - ' + n.name + ': variable=' + (n.config.variable || 'N/A'));
    });

    console.log('\n✅ Actualización de base de datos completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

updateNodeWithButtons();
ENDSCRIPT

# 2. Ejecutar actualización de BD
echo ""
echo "📊 Actualizando nodos de bot en base de datos..."
node /tmp/update-bot-buttons.js

# 3. Crear parche para bot-engine.service.js compilado
echo ""
echo "🔧 Aplicando parches al código compilado..."

# Parche para sendButtonsMessage en wppconnect.service.js
cat > /tmp/patch-buttons.js << 'PATCHSCRIPT'
const fs = require('fs');

// Archivo a parchear
const wppFile = '/var/www/crm-ngso-whatsapp/backend/dist/modules/whatsapp/providers/wppconnect.service.js';
const wsFile = '/var/www/crm-ngso-whatsapp/backend/dist/modules/whatsapp/whatsapp.service.js';
const botFile = '/var/www/crm-ngso-whatsapp/backend/dist/modules/bot/bot-engine.service.js';

// Función para agregar método si no existe
function addMethodIfNotExists(filePath, methodName, methodCode) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes(methodName)) {
    console.log('⚠️ ' + methodName + ' ya existe en ' + filePath);
    return;
  }
  
  // Buscar el cierre de la clase
  const lastBrace = content.lastIndexOf('};');
  if (lastBrace === -1) {
    console.log('❌ No se encontró cierre de clase en ' + filePath);
    return;
  }
  
  // Insertar antes del último cierre
  const newContent = content.slice(0, lastBrace) + methodCode + '\n' + content.slice(lastBrace);
  fs.writeFileSync(filePath, newContent);
  console.log('✅ Agregado ' + methodName + ' a ' + filePath);
}

// Método sendButtonsMessage para wppconnect.service.js
const sendButtonsMethod = `
    async sendButtonsMessage(sessionName, to, title, description, buttons) {
        const client = this.clients.get(sessionName);
        if (!client) {
            throw new Error('Sesión ' + sessionName + ' no encontrada');
        }
        try {
            this.logger.log('📤 Enviando botones a ' + to);
            const result = await client.sendText(to, description + '\\n\\n' + buttons.map((b, i) => (i+1) + '. ' + b.text).join('\\n'));
            return result;
        } catch (error) {
            this.logger.error('Error enviando botones: ' + error.message);
            throw error;
        }
    }
    async sendListMessage(sessionName, to, title, description, buttonText, sections) {
        const client = this.clients.get(sessionName);
        if (!client) {
            throw new Error('Sesión ' + sessionName + ' no encontrada');
        }
        try {
            this.logger.log('📤 Enviando lista a ' + to);
            const rows = sections.flatMap(s => s.rows);
            const result = await client.sendText(to, description + '\\n\\n' + rows.map((r, i) => (i+1) + '. ' + r.title).join('\\n'));
            return result;
        } catch (error) {
            this.logger.error('Error enviando lista: ' + error.message);
            throw error;
        }
    }
`;

// Método sendButtonsMessage para whatsapp.service.js
const wsButtonsMethod = `
    async sendButtonsMessage(whatsappNumberId, to, title, description, buttons) {
        const whatsappNumber = await this.findOne(whatsappNumberId);
        const sessionName = whatsappNumber.phoneNumber;
        const formattedTo = to.includes('@') ? to : to + '@c.us';
        this.logger.log('📤 Enviando botones via WPPConnect - To: ' + formattedTo);
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
        this.logger.log('📤 Enviando lista via WPPConnect - To: ' + formattedTo);
        try {
            const result = await this.wppConnectService.sendListMessage(sessionName, formattedTo, title, description, buttonText, sections);
            return { messageId: (result && result.id) || ('wpp-list-' + Date.now()), metadata: result };
        } catch (error) {
            this.logger.error('Error enviando lista: ' + error.message);
            throw error;
        }
    }
`;

// Aplicar parches
console.log('🔧 Parcheando archivos compilados...');
addMethodIfNotExists(wppFile, 'sendButtonsMessage', sendButtonsMethod);
addMethodIfNotExists(wsFile, 'sendButtonsMessage', wsButtonsMethod);

console.log('✅ Parches aplicados');
PATCHSCRIPT

node /tmp/patch-buttons.js

# 4. Reiniciar backend
echo ""
echo "🔄 Reiniciando backend..."
pm2 restart crm-backend
sleep 3
pm2 status crm-backend

echo ""
echo "====================================="
echo "✅ Despliegue completado"
echo "====================================="
