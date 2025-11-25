/**
 * Script de Testing para WhatsApp Flow
 * NGS&O CRM - Desarrollado por Alejandro Sandoval
 * 
 * Este script prueba:
 * 1. Sesiones de WhatsApp activas
 * 2. Chats iniciados
 * 3. Mensajes recibidos
 * 4. Flujo del bot
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

// Colores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

/**
 * Autenticar con el API
 */
async function authenticate() {
  logSection('1. AUTENTICACIÓN');
  
  // Lista de credenciales para probar
  const credentials = [
    { email: 'admin@crm.com', password: 'password123' },
    { email: 'juan@crm.com', password: 'password123' },
    { email: 'superadmin@ngso.com', password: 'SuperAdmin123!' },
  ];

  for (const cred of credentials) {
    try {
      logInfo(`Intentando con: ${cred.email}`);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: cred.email,
        password: cred.password,
      });

      if (response.data && response.data.data && response.data.data.accessToken) {
        authToken = response.data.data.accessToken;
        logSuccess(`Autenticación exitosa con: ${cred.email}`);
        logInfo(`Token: ${authToken.substring(0, 30)}...`);
        return true;
      }
    } catch (error) {
      logWarning(`Falló con ${cred.email}: ${error.response?.data?.message || error.message}`);
      continue;
    }
  }

  logError('No se pudo autenticar con ninguna de las credenciales');
  logInfo('Credenciales probadas:');
  credentials.forEach((cred) => {
    logInfo(`  - ${cred.email}`);
  });
  return false;
}

/**
 * Obtener headers con autenticación
 */
function getHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Test 1: Verificar sesiones activas de WhatsApp
 */
async function testActiveSessions() {
  logSection('2. SESIONES DE WHATSAPP ACTIVAS');
  try {
    const response = await axios.get(
      `${API_BASE_URL}/whatsapp-numbers/sessions/active`,
      getHeaders()
    );

    const sessions = response.data;
    logInfo(`Total de sesiones: ${sessions.totalSessions || 0}`);
    logInfo(`Sesiones conectadas: ${sessions.connectedSessions || 0}`);
    logInfo(`Sesiones desconectadas: ${sessions.disconnectedSessions || 0}`);

    if (sessions.sessions && sessions.sessions.length > 0) {
      console.log('\nDetalle de sesiones:');
      sessions.sessions.forEach((session, index) => {
        console.log(`\n  ${index + 1}. ${session.displayName || session.phoneNumber}`);
        logInfo(`     Número: ${session.phoneNumber}`);
        logInfo(`     Estado: ${session.status}`);
        logInfo(`     Conectado: ${session.isConnected ? 'Sí' : 'No'}`);
        logInfo(`     Mensajes enviados: ${session.messagesSent}`);
        logInfo(`     Mensajes recibidos: ${session.messagesReceived}`);
      });
      logSuccess(`\n${sessions.sessions.length} sesión(es) encontrada(s)`);
      return sessions.sessions;
    } else {
      logWarning('No hay sesiones activas de WhatsApp');
      logInfo('Para crear una sesión, ve a: WhatsApp Management -> Conectar WhatsApp');
      return [];
    }
  } catch (error) {
    logError(`Error al obtener sesiones: ${error.message}`);
    if (error.response) {
      logError(`Detalles: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return [];
  }
}

/**
 * Test 2: Verificar chats iniciados
 */
async function testChats() {
  logSection('3. CHATS INICIADOS');
  try {
    const response = await axios.get(`${API_BASE_URL}/chats`, getHeaders());

    const chats = response.data?.data || [];
    logInfo(`Total de chats: ${chats.length}`);

    if (chats.length > 0) {
      // Agrupar por estado
      const byStatus = {};
      chats.forEach((chat) => {
        byStatus[chat.status] = (byStatus[chat.status] || 0) + 1;
      });

      console.log('\nChats por estado:');
      Object.keys(byStatus).forEach((status) => {
        logInfo(`  ${status}: ${byStatus[status]}`);
      });

      // Mostrar últimos 5 chats
      console.log('\nÚltimos 5 chats:');
      chats.slice(0, 5).forEach((chat, index) => {
        console.log(`\n  ${index + 1}. ${chat.clientPhone}`);
        logInfo(`     Estado: ${chat.status}`);
        logInfo(`     Campaña: ${chat.campaign?.name || 'N/A'}`);
        logInfo(`     Agente: ${chat.assignedAgent?.fullName || 'Sin asignar'}`);
        logInfo(`     Última actividad: ${chat.lastMessageAt || chat.createdAt}`);
      });

      logSuccess(`\n${chats.length} chat(s) encontrado(s)`);
      return chats;
    } else {
      logWarning('No hay chats iniciados');
      logInfo('Envía un mensaje a un número de WhatsApp conectado para iniciar un chat');
      return [];
    }
  } catch (error) {
    logError(`Error al obtener chats: ${error.message}`);
    if (error.response) {
      logError(`Detalles: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return [];
  }
}

/**
 * Test 3: Verificar mensajes recibidos
 */
async function testMessages(chatId = null) {
  logSection('4. MENSAJES RECIBIDOS');
  try {
    // Si no se proporciona chatId, obtener el primer chat disponible
    if (!chatId) {
      const chatsResponse = await axios.get(`${API_BASE_URL}/chats`, getHeaders());
      const chats = chatsResponse.data?.data || [];
      
      if (chats.length === 0) {
        logWarning('No hay chats disponibles para verificar mensajes');
        return [];
      }
      
      chatId = chats[0].id;
      logInfo(`Usando chat: ${chats[0].clientPhone}`);
    }

    const response = await axios.get(
      `${API_BASE_URL}/messages?chatId=${chatId}`,
      getHeaders()
    );

    const messages = response.data?.data || [];
    logInfo(`Total de mensajes en el chat: ${messages.length}`);

    if (messages.length > 0) {
      // Contar por dirección
      const inbound = messages.filter((m) => m.direction === 'inbound').length;
      const outbound = messages.filter((m) => m.direction === 'outbound').length;

      logInfo(`Mensajes recibidos (inbound): ${inbound}`);
      logInfo(`Mensajes enviados (outbound): ${outbound}`);

      // Mostrar últimos 5 mensajes
      console.log('\nÚltimos 5 mensajes:');
      messages.slice(-5).forEach((msg, index) => {
        const direction = msg.direction === 'inbound' ? '←' : '→';
        const type = msg.isFromBot ? '[BOT]' : '[HUMANO]';
        console.log(`\n  ${direction} ${type} ${msg.content}`);
        logInfo(`     Fecha: ${new Date(msg.createdAt).toLocaleString('es-CO')}`);
        logInfo(`     Tipo: ${msg.type}`);
      });

      logSuccess(`\n${messages.length} mensaje(s) encontrado(s)`);
      return messages;
    } else {
      logWarning('No hay mensajes en este chat');
      return [];
    }
  } catch (error) {
    logError(`Error al obtener mensajes: ${error.message}`);
    if (error.response) {
      logError(`Detalles: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return [];
  }
}

/**
 * Test 4: Verificar flujo del bot
 */
async function testBotFlow() {
  logSection('5. VERIFICACIÓN DEL FLUJO DEL BOT');
  try {
    // Obtener todos los chats
    const chatsResponse = await axios.get(`${API_BASE_URL}/chats`, getHeaders());
    const chats = chatsResponse.data?.data || [];

    if (chats.length === 0) {
      logWarning('No hay chats para verificar el flujo del bot');
      logInfo('El bot se activa automáticamente cuando llega un mensaje nuevo');
      return;
    }

    // Buscar chats con mensajes del bot
    let botsActivated = 0;
    let totalMessages = 0;

    for (const chat of chats.slice(0, 10)) {
      // Solo revisar primeros 10 chats
      try {
        const messagesResponse = await axios.get(
          `${API_BASE_URL}/messages?chatId=${chat.id}`,
          getHeaders()
        );
        const messages = messagesResponse.data?.data || [];
        const botMessages = messages.filter((m) => m.isFromBot);

        if (botMessages.length > 0) {
          botsActivated++;
          totalMessages += botMessages.length;
        }
      } catch (error) {
        // Ignorar errores individuales
      }
    }

    logInfo(`Chats analizados: ${Math.min(chats.length, 10)}`);
    logInfo(`Chats con bot activado: ${botsActivated}`);
    logInfo(`Total de mensajes del bot: ${totalMessages}`);

    if (botsActivated > 0) {
      logSuccess('El bot está funcionando correctamente');
    } else {
      logWarning('No se encontraron mensajes del bot');
      logInfo('Posibles razones:');
      logInfo('  1. No hay flujos de bot configurados');
      logInfo('  2. Los mensajes no cumplen las condiciones del bot');
      logInfo('  3. El evento "message.created" no se está emitiendo correctamente');
    }
  } catch (error) {
    logError(`Error al verificar flujo del bot: ${error.message}`);
  }
}

/**
 * Test 5: Verificar eventos en tiempo real
 */
async function testRealtimeEvents() {
  logSection('6. EVENTOS EN TIEMPO REAL (WebSocket)');
  logInfo('Para probar eventos en tiempo real:');
  logInfo('1. Abre el frontend en tu navegador');
  logInfo('2. Abre las DevTools (F12) -> Consola');
  logInfo('3. Envía un mensaje desde tu teléfono al número de WhatsApp conectado');
  logInfo('4. Deberías ver en la consola: "✅ Socket.IO conectado"');
  logInfo('5. Y luego: "[Socket] Nuevo mensaje recibido"');
  console.log('\nPara probar, envía un mensaje ahora y presiona Enter cuando termines...');
  
  // Esperar entrada del usuario
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  logInfo('Verificando si se recibió el mensaje...');
  await testChats();
}

/**
 * Diagnóstico completo
 */
async function runDiagnostics() {
  logSection('DIAGNÓSTICO DE WHATSAPP - NGS&O CRM');
  logInfo('Fecha: ' + new Date().toLocaleString('es-CO'));
  
  // Autenticar
  const authenticated = await authenticate();
  if (!authenticated) {
    logError('\n❌ No se pudo autenticar. Verifica las credenciales.');
    logInfo('Email por defecto: admin@ngso.com');
    logInfo('Password por defecto: Admin123!');
    return;
  }

  // Ejecutar tests
  const sessions = await testActiveSessions();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const chats = await testChats();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (chats.length > 0) {
    await testMessages(chats[0].id);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await testBotFlow();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Resumen final
  logSection('RESUMEN DEL DIAGNÓSTICO');
  
  if (sessions.length === 0) {
    logError('❌ No hay sesiones de WhatsApp conectadas');
    logInfo('   Acción requerida: Conecta un número en WhatsApp Management');
  } else {
    logSuccess(`✓ ${sessions.length} sesión(es) de WhatsApp activa(s)`);
  }

  if (chats.length === 0) {
    logWarning('⚠ No hay chats iniciados');
    logInfo('   Acción requerida: Envía un mensaje a uno de los números conectados');
  } else {
    logSuccess(`✓ ${chats.length} chat(s) encontrado(s)`);
  }

  console.log('\n' + '='.repeat(60));
  logInfo('Para pruebas en tiempo real, ejecuta: node test-whatsapp-flow.js --realtime');
  console.log('='.repeat(60) + '\n');
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--realtime')) {
    const authenticated = await authenticate();
    if (authenticated) {
      await testRealtimeEvents();
    }
  } else {
    await runDiagnostics();
  }

  process.exit(0);
}

// Ejecutar
main().catch((error) => {
  logError(`Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
