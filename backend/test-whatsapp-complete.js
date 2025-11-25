/**
 * Script de Validación Completa - WhatsApp Flow
 * NGS&O CRM - Sistema de Testing Integral
 * Desarrollado por: Alejandro Sandoval - AS Software
 */

const axios = require('axios');
const readline = require('readline');

const API_BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '━'.repeat(70));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log('━'.repeat(70));
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

function logStep(step, total, message) {
  log(`[${step}/${total}] ${message}`, colors.magenta);
}

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Autenticar
 */
async function authenticate() {
  logSection('🔐 AUTENTICACIÓN');
  
  const credentials = [
    { email: 'admin@crm.com', password: 'password123' },
    { email: 'juan@crm.com', password: 'password123' },
  ];

  for (const cred of credentials) {
    try {
      logInfo(`Intentando autenticación: ${cred.email}`);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: cred.email,
        password: cred.password,
      });

      if (response.data?.data?.accessToken) {
        authToken = response.data.data.accessToken;
        logSuccess(`Autenticado como: ${cred.email}`);
        return { success: true, user: response.data.data.user };
      }
    } catch (error) {
      continue;
    }
  }

  logError('No se pudo autenticar con ninguna credencial');
  return { success: false };
}

function getHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Test 1: Verificar números WhatsApp registrados
 */
async function testWhatsAppNumbers() {
  logSection('📱 TEST 1: NÚMEROS WHATSAPP REGISTRADOS');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/whatsapp-numbers`, getHeaders());
    const numbers = response.data?.data || response.data || [];

    if (numbers.length === 0) {
      logWarning('No hay números de WhatsApp registrados');
      logInfo('Acción: Crear un número en WhatsApp Management');
      return { success: false, numbers: [] };
    }

    logSuccess(`${numbers.length} número(s) encontrado(s)`);
    
    numbers.forEach((num, idx) => {
      console.log(`\n  ${idx + 1}. ${num.displayName || num.phoneNumber}`);
      logInfo(`     Teléfono: ${num.phoneNumber}`);
      logInfo(`     Proveedor: ${num.provider}`);
      logInfo(`     Estado: ${num.status}`);
      logInfo(`     Activo: ${num.isActive ? 'Sí' : 'No'}`);
      logInfo(`     Campaña: ${num.campaign?.name || 'Sin campaña'}`);
    });

    return { success: true, numbers };
  } catch (error) {
    logError(`Error: ${error.message}`);
    return { success: false, numbers: [] };
  }
}

/**
 * Test 2: Verificar sesiones activas
 */
async function testActiveSessions() {
  logSection('🔌 TEST 2: SESIONES ACTIVAS');
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/whatsapp-numbers/sessions/active`,
      getHeaders()
    );

    const data = response.data?.data || response.data;
    
    logInfo(`Total de sesiones: ${data.totalSessions || 0}`);
    logInfo(`Sesiones activas: ${data.activeSessions || 0}`);
    logInfo(`Máximo permitido: ${data.maxSessions || 5}`);

    if (data.sessions && data.sessions.length > 0) {
      console.log('\n  Detalle de sesiones:');
      data.sessions.forEach((session, idx) => {
        console.log(`\n  ${idx + 1}. ${session.displayName}`);
        logInfo(`     Conectado: ${session.isConnected ? 'SÍ ✓' : 'NO ✗'}`);
        logInfo(`     Estado: ${session.status}`);
        logInfo(`     Mensajes enviados: ${session.messagesSent || 0}`);
        logInfo(`     Mensajes recibidos: ${session.messagesReceived || 0}`);
      });

      const connected = data.sessions.filter(s => s.isConnected);
      if (connected.length > 0) {
        logSuccess(`${connected.length} sesión(es) conectada(s)`);
        return { success: true, sessions: connected };
      } else {
        logWarning('No hay sesiones conectadas');
        return { success: false, sessions: [] };
      }
    } else {
      logWarning('No hay sesiones registradas');
      return { success: false, sessions: [] };
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return { success: false, sessions: [] };
  }
}

/**
 * Test 3: Verificar chats existentes
 */
async function testChats() {
  logSection('💬 TEST 3: CHATS EXISTENTES');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/chats`, getHeaders());
    const chats = response.data?.data || [];

    logInfo(`Total de chats: ${chats.length}`);

    if (chats.length > 0) {
      const byStatus = {};
      chats.forEach(chat => {
        byStatus[chat.status] = (byStatus[chat.status] || 0) + 1;
      });

      console.log('\n  Chats por estado:');
      Object.keys(byStatus).forEach(status => {
        logInfo(`    ${status}: ${byStatus[status]}`);
      });

      logSuccess('Sistema tiene chats registrados');
      return { success: true, chats };
    } else {
      logInfo('No hay chats todavía (normal en sistema nuevo)');
      return { success: true, chats: [] };
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return { success: false, chats: [] };
  }
}

/**
 * Test 4: Verificar mensajes
 */
async function testMessages(chats) {
  logSection('📨 TEST 4: MENSAJES EN CHATS');
  
  if (chats.length === 0) {
    logInfo('No hay chats para verificar mensajes');
    return { success: true, hasMessages: false };
  }

  try {
    const chatId = chats[0].id;
    const response = await axios.get(
      `${API_BASE_URL}/messages?chatId=${chatId}`,
      getHeaders()
    );

    const messages = response.data?.data || [];
    logInfo(`Chat "${chats[0].contactPhone}": ${messages.length} mensaje(s)`);

    if (messages.length > 0) {
      const inbound = messages.filter(m => m.direction === 'inbound').length;
      const outbound = messages.filter(m => m.direction === 'outbound').length;

      logInfo(`  Recibidos: ${inbound}`);
      logInfo(`  Enviados: ${outbound}`);
      logSuccess('Sistema tiene mensajes registrados');
      return { success: true, hasMessages: true };
    } else {
      logInfo('Este chat no tiene mensajes todavía');
      return { success: true, hasMessages: false };
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return { success: false, hasMessages: false };
  }
}

/**
 * Test 5: Enviar mensaje de prueba
 */
async function testSendMessage(numbers) {
  logSection('📤 TEST 5: ENVÍO DE MENSAJE');
  
  if (numbers.length === 0) {
    logWarning('No hay números para enviar mensajes');
    return { success: false };
  }

  const number = numbers[0];
  
  log(`\n¿Deseas enviar un mensaje de prueba desde ${number.displayName}?`, colors.yellow);
  const answer = await question('Ingresa el número destino (o ENTER para omitir): ');

  if (!answer || answer.trim() === '') {
    logInfo('Test de envío omitido');
    return { success: true, skipped: true };
  }

  try {
    logInfo(`Enviando mensaje a: ${answer}`);
    
    const response = await axios.post(
      `${API_BASE_URL}/whatsapp/send-message`,
      {
        whatsappNumberId: number.id,
        to: answer,
        content: '🤖 Mensaje de prueba desde NGS&O CRM - Todo funciona correctamente!',
        type: 'text',
      },
      getHeaders()
    );

    logSuccess('Mensaje enviado correctamente');
    logInfo(`ID del mensaje: ${response.data?.data?.messageId || 'N/A'}`);
    return { success: true };
  } catch (error) {
    logError(`Error al enviar: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
}

/**
 * Test 6: Prueba de recepción en tiempo real
 */
async function testRealtimeReception(numbers) {
  logSection('📥 TEST 6: RECEPCIÓN EN TIEMPO REAL');
  
  if (numbers.length === 0) {
    logWarning('No hay números conectados para recibir mensajes');
    return { success: false };
  }

  const connectedNumbers = numbers.filter(n => n.status === 'connected');
  
  if (connectedNumbers.length === 0) {
    logWarning('No hay números conectados actualmente');
    logInfo('Conecta un número en WhatsApp Management primero');
    return { success: false };
  }

  console.log('\n' + '─'.repeat(70));
  log('  📱 INSTRUCCIONES PARA PRUEBA EN TIEMPO REAL:', colors.bright);
  console.log('─'.repeat(70));
  
  connectedNumbers.forEach((num, idx) => {
    log(`\n  ${idx + 1}. Envía un mensaje de WhatsApp a:`, colors.green);
    log(`     ${num.phoneNumber}`, colors.bright + colors.green);
    log(`     (${num.displayName})`, colors.green);
  });

  console.log('\n' + '─'.repeat(70));
  log('  Qué debería pasar:', colors.cyan);
  log('    ✓ El mensaje se recibe en WPPConnect', colors.blue);
  log('    ✓ Se crea/encuentra el cliente automáticamente', colors.blue);
  log('    ✓ Se crea/encuentra el chat', colors.blue);
  log('    ✓ El mensaje se guarda en la base de datos', colors.blue);
  log('    ✓ Aparece en el frontend del admin', colors.blue);
  log('    ✓ Suena la notificación', colors.blue);
  console.log('─'.repeat(70));

  await question('\nPresiona ENTER cuando hayas enviado el mensaje de prueba...');

  // Esperar un poco
  logInfo('Esperando 3 segundos para que se procese el mensaje...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Verificar si se creó un chat nuevo
  try {
    const response = await axios.get(`${API_BASE_URL}/chats`, getHeaders());
    const chats = response.data?.data || [];
    
    logInfo(`Chats totales después del test: ${chats.length}`);
    
    const recentChats = chats.filter(chat => {
      const createdAt = new Date(chat.createdAt);
      const now = new Date();
      const diffMinutes = (now - createdAt) / 1000 / 60;
      return diffMinutes < 2; // Últimos 2 minutos
    });

    if (recentChats.length > 0) {
      logSuccess(`¡Se detectaron ${recentChats.length} chat(s) nuevo(s)!`);
      recentChats.forEach(chat => {
        logInfo(`  Chat: ${chat.contactPhone} - ${chat.contactName}`);
      });
      return { success: true };
    } else {
      logWarning('No se detectaron chats nuevos');
      logInfo('Verifica:');
      logInfo('  1. Que el número esté realmente conectado');
      logInfo('  2. Que enviaste el mensaje al número correcto');
      logInfo('  3. Los logs del backend para errores');
      return { success: false };
    }
  } catch (error) {
    logError(`Error verificando chats: ${error.message}`);
    return { success: false };
  }
}

/**
 * Test 7: Validar botones de acción
 */
async function testActionButtons(chats) {
  logSection('🔘 TEST 7: BOTONES DE ACCIÓN');
  
  if (chats.length === 0) {
    logInfo('No hay chats para probar botones');
    return { success: true, skipped: true };
  }

  const chatWithClient = chats.find(c => c.clientId);
  
  if (!chatWithClient) {
    logWarning('No hay chats con clientes asociados');
    return { success: true, skipped: true };
  }

  try {
    const clientId = chatWithClient.clientId;
    logInfo(`Usando cliente: ${chatWithClient.contactPhone}`);

    // Test: Actualizar a "contactado"
    logStep(1, 3, 'Probando botón "Contactado"');
    const updateResponse = await axios.patch(
      `${API_BASE_URL}/clients/${clientId}`,
      { collectionStatus: 'contacted' },
      getHeaders()
    );

    if (updateResponse.data) {
      logSuccess('Estado actualizado a "contacted"');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Test: Registrar promesa
    logStep(2, 3, 'Probando botón "Promesa"');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const promiseResponse = await axios.patch(
      `${API_BASE_URL}/clients/${clientId}`,
      {
        collectionStatus: 'promise',
        promisePaymentDate: futureDate.toISOString(),
        promisePaymentAmount: 50000,
      },
      getHeaders()
    );

    if (promiseResponse.data) {
      logSuccess('Promesa registrada correctamente');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Test: Marcar como pagado
    logStep(3, 3, 'Probando botón "Pagado"');
    const paidResponse = await axios.patch(
      `${API_BASE_URL}/clients/${clientId}`,
      { collectionStatus: 'paid' },
      getHeaders()
    );

    if (paidResponse.data) {
      logSuccess('Estado actualizado a "paid"');
    }

    logSuccess('¡Todos los botones funcionan correctamente!');
    return { success: true };
  } catch (error) {
    logError(`Error en test de botones: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
}

/**
 * Ejecutar todas las validaciones
 */
async function runValidation() {
  console.clear();
  log('\n╔═══════════════════════════════════════════════════════════════════╗', colors.bright + colors.cyan);
  log('║     VALIDACIÓN COMPLETA - SISTEMA WHATSAPP NGS&O CRM            ║', colors.bright + colors.cyan);
  log('╚═══════════════════════════════════════════════════════════════════╝', colors.bright + colors.cyan);

  const results = {
    auth: false,
    numbers: false,
    sessions: false,
    chats: false,
    messages: false,
    send: false,
    receive: false,
    buttons: false,
  };

  // 1. Autenticación
  const authResult = await authenticate();
  if (!authResult.success) {
    logError('\n❌ No se pudo continuar sin autenticación');
    rl.close();
    process.exit(1);
  }
  results.auth = true;

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. Números WhatsApp
  const numbersResult = await testWhatsAppNumbers();
  results.numbers = numbersResult.success;

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. Sesiones activas
  const sessionsResult = await testActiveSessions();
  results.sessions = sessionsResult.success;

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. Chats
  const chatsResult = await testChats();
  results.chats = chatsResult.success;

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 5. Mensajes
  if (chatsResult.chats.length > 0) {
    const messagesResult = await testMessages(chatsResult.chats);
    results.messages = messagesResult.success;
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 6. Envío de mensajes
  if (numbersResult.numbers.length > 0) {
    const sendResult = await testSendMessage(numbersResult.numbers);
    results.send = sendResult.success;
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 7. Recepción en tiempo real
  if (numbersResult.numbers.length > 0) {
    const receiveResult = await testRealtimeReception(numbersResult.numbers);
    results.receive = receiveResult.success;
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 8. Botones de acción
  if (chatsResult.chats.length > 0) {
    const buttonsResult = await testActionButtons(chatsResult.chats);
    results.buttons = buttonsResult.success;
  }

  // Resumen final
  logSection('📊 RESUMEN DE VALIDACIÓN');
  
  const tests = [
    { name: 'Autenticación', status: results.auth },
    { name: 'Números WhatsApp', status: results.numbers },
    { name: 'Sesiones Activas', status: results.sessions },
    { name: 'Chats Existentes', status: results.chats },
    { name: 'Mensajes', status: results.messages },
    { name: 'Envío de Mensajes', status: results.send },
    { name: 'Recepción Tiempo Real', status: results.receive },
    { name: 'Botones de Acción', status: results.buttons },
  ];

  console.log('');
  tests.forEach(test => {
    const icon = test.status ? '✓' : '✗';
    const color = test.status ? colors.green : colors.red;
    log(`  ${icon} ${test.name}`, color);
  });

  const passed = tests.filter(t => t.status).length;
  const total = tests.length;
  const percentage = Math.round((passed / total) * 100);

  console.log('\n' + '─'.repeat(70));
  log(`  RESULTADO: ${passed}/${total} tests pasados (${percentage}%)`, colors.bright);
  
  if (percentage === 100) {
    log(`  🎉 ¡SISTEMA COMPLETAMENTE FUNCIONAL!`, colors.green);
  } else if (percentage >= 70) {
    log(`  ⚠️  Sistema mayormente funcional, revisar fallos`, colors.yellow);
  } else {
    log(`  ❌ Sistema requiere atención`, colors.red);
  }
  
  console.log('─'.repeat(70) + '\n');

  rl.close();
  process.exit(0);
}

// Ejecutar
runValidation().catch(error => {
  logError(`\nError fatal: ${error.message}`);
  console.error(error);
  rl.close();
  process.exit(1);
});
