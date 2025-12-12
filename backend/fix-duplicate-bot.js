/**
 * Script para deshabilitar el listener duplicado de BotExecutorService
 * y corregir el flujo del bot
 */
const fs = require('fs');

const botExecutorFile = '/var/www/crm-ngso-whatsapp/backend/dist/modules/bot/bot-executor.service.js';

// Leer el archivo
let content = fs.readFileSync(botExecutorFile, 'utf8');

// Verificar si ya está parcheado
if (content.includes('// DESHABILITADO - Listener duplicado')) {
  console.log('El archivo ya está parcheado');
  process.exit(0);
}

// Buscar y comentar el método handleMessageCreated
// El decorador @OnEvent compila a __decorate con el método
const originalPattern = /handleMessageCreated\(payload\)/;
const newPattern = `handleMessageCreated_DISABLED(payload)`;

if (content.includes('handleMessageCreated(payload)')) {
  // Renombrar el método para deshabilitarlo
  content = content.replace(
    /handleMessageCreated\(payload\)/g,
    'handleMessageCreated_DISABLED(payload)'
  );
  
  // También renombrar la referencia en __decorate si existe
  content = content.replace(
    /"handleMessageCreated"/g,
    '"handleMessageCreated_DISABLED"'
  );
  
  fs.writeFileSync(botExecutorFile, content);
  console.log('✅ BotExecutorService.handleMessageCreated deshabilitado');
  console.log('   El bot ahora solo responderá via BotEngineService');
} else {
  console.log('No se encontró handleMessageCreated para deshabilitar');
}

// Ahora también necesitamos asegurarnos que el nodo MESSAGE no avance automáticamente
// si tiene useButtons porque debe esperar la respuesta del usuario
const botEngineFile = '/var/www/crm-ngso-whatsapp/backend/dist/modules/bot/bot-engine.service.js';
let botEngineContent = fs.readFileSync(botEngineFile, 'utf8');

// Verificar si executeMessageNode tiene la lógica correcta para botones
if (botEngineContent.includes('useButtons') && !botEngineContent.includes('// Si tiene botones, NO avanzar')) {
  // Buscar donde está el avance automático en executeMessageNode
  // y agregar condición para no avanzar si tiene botones
  
  // La lógica actual avanza si hay nextNodeId, pero con botones debemos esperar
  const avancePattern = /if \(node\.nextNodeId\) \{[\s\S]*?session\.currentNodeId = node\.nextNodeId/;
  
  if (avancePattern.test(botEngineContent)) {
    botEngineContent = botEngineContent.replace(
      avancePattern,
      `// Si tiene botones, NO avanzar automáticamente - esperar respuesta del usuario
        if (node.config.useButtons) {
            this.logger.log('Esperando respuesta de botones del usuario...');
        } else if (node.nextNodeId) {
            const session = this.sessions.get(chatId);
            if (session) {
                session.currentNodeId = node.nextNodeId`
    );
    fs.writeFileSync(botEngineFile, botEngineContent);
    console.log('✅ executeMessageNode actualizado para esperar respuesta de botones');
  }
} else {
  console.log('executeMessageNode ya tiene la lógica de botones o no se encontró useButtons');
}

console.log('\n✅ Parches aplicados');
