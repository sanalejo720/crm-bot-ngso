#!/usr/bin/env node

/**
 * Script de pruebas E2E para el sistema de gestión de estados de chats
 * Prueba todos los flujos implementados en FASE 1-7
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Configuración
const API_URL = process.env.API_URL || 'http://72.61.73.9:3000';
let TOKEN = null;
let USER_ID = null;
let TEST_CHAT_ID = null;
let TEST_AGENT_ID = null;

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// ==================== PRUEBAS ====================

/**
 * Test 1: Autenticación
 */
async function test1_authentication() {
  log('\n📋 TEST 1: Autenticación', 'cyan');
  
  try {
    const email = await prompt('Email: ');
    const password = await prompt('Password: ');

    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    TOKEN = response.data.access_token;
    USER_ID = response.data.user.id;

    log('✅ Autenticación exitosa', 'green');
    log(`Usuario: ${response.data.user.fullName} (ID: ${USER_ID})`, 'blue');
    log(`Role: ${response.data.user.role.name}`, 'blue');
    
    return true;
  } catch (error) {
    log(`❌ Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Test 2: Cola de espera
 */
async function test2_waitingQueue() {
  log('\n📋 TEST 2: Cola de espera (BOT_WAITING_QUEUE)', 'cyan');

  try {
    const response = await axios.get(`${API_URL}/chats/waiting-queue`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    const chats = response.data.data;
    log(`✅ Cola de espera cargada: ${chats.length} chats`, 'green');

    if (chats.length > 0) {
      log('\nChats en espera:', 'blue');
      chats.slice(0, 5).forEach((chat, index) => {
        const waitTime = Math.floor(
          (Date.now() - new Date(chat.lastClientMessageAt).getTime()) / 60000,
        );
        log(
          `  ${index + 1}. Chat #${chat.id} - ${chat.contactPhone} - ${waitTime} min esperando`,
          'yellow',
        );
      });

      TEST_CHAT_ID = chats[0].id;
      log(`\n💡 Usando Chat #${TEST_CHAT_ID} para pruebas`, 'blue');
    } else {
      log('⚠️  No hay chats en cola de espera', 'yellow');
      log('💡 Crear un chat manualmente o usar el bot', 'blue');
    }

    return true;
  } catch (error) {
    log(`❌ Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Test 3: Asignación manual
 */
async function test3_manualAssignment() {
  log('\n📋 TEST 3: Asignación manual desde cola', 'cyan');

  if (!TEST_CHAT_ID) {
    log('⚠️  No hay chat de prueba, saltando test', 'yellow');
    return false;
  }

  try {
    const response = await axios.post(
      `${API_URL}/chats/${TEST_CHAT_ID}/assign`,
      {
        agentId: USER_ID,
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
      },
    );

    log('✅ Chat asignado exitosamente', 'green');
    log(`Estado: ${response.data.status} -> ${response.data.subStatus}`, 'blue');
    log(`Agente: ${response.data.assignedAgent?.fullName}`, 'blue');
    log(`Asignado en: ${response.data.assignedAt}`, 'blue');

    return true;
  } catch (error) {
    log(`❌ Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Test 4: Estado del chat
 */
async function test4_chatState() {
  log('\n📋 TEST 4: Verificar estado del chat', 'cyan');

  if (!TEST_CHAT_ID) {
    log('⚠️  No hay chat de prueba, saltando test', 'yellow');
    return false;
  }

  try {
    const response = await axios.get(`${API_URL}/chats/${TEST_CHAT_ID}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    const chat = response.data;
    log('✅ Estado del chat obtenido', 'green');
    log(`Estado principal: ${chat.status}`, 'blue');
    log(`Sub-estado: ${chat.subStatus}`, 'blue');
    log(`Bot activo: ${chat.isBotActive}`, 'blue');
    log(`Agente asignado: ${chat.assignedAgent?.fullName || 'Ninguno'}`, 'blue');
    log(`Transferencias: ${chat.transferCount}`, 'blue');
    log(`Reiniciado con bot: ${chat.botRestartCount}`, 'blue');

    return true;
  } catch (error) {
    log(`❌ Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Test 5: Historial de transiciones
 */
async function test5_stateTransitions() {
  log('\n📋 TEST 5: Historial de transiciones de estado', 'cyan');

  if (!TEST_CHAT_ID) {
    log('⚠️  No hay chat de prueba, saltando test', 'yellow');
    return false;
  }

  try {
    const response = await axios.get(
      `${API_URL}/chats/${TEST_CHAT_ID}/state-transitions`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
      },
    );

    const transitions = response.data.data;
    log(`✅ Historial obtenido: ${transitions.length} transiciones`, 'green');

    if (transitions.length > 0) {
      log('\nÚltimas transiciones:', 'blue');
      transitions.slice(0, 10).forEach((t, index) => {
        log(
          `  ${index + 1}. ${t.fromStatus}/${t.fromSubStatus || '-'} → ${t.toStatus}/${t.toSubStatus || '-'}`,
          'yellow',
        );
        log(`     Razón: ${t.reason}`, 'yellow');
        log(`     Por: ${t.triggeredBy} (${new Date(t.createdAt).toLocaleString()})`, 'yellow');
      });
    }

    return true;
  } catch (error) {
    log(`❌ Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Test 6: Transferencia entre agentes
 */
async function test6_transfer() {
  log('\n📋 TEST 6: Transferencia entre agentes', 'cyan');

  if (!TEST_CHAT_ID) {
    log('⚠️  No hay chat de prueba, saltando test', 'yellow');
    return false;
  }

  try {
    // Obtener lista de agentes
    const agentsResponse = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      params: { role: 'Agente' },
    });

    const agents = agentsResponse.data.data.filter((a) => a.id !== USER_ID);

    if (agents.length === 0) {
      log('⚠️  No hay otros agentes disponibles', 'yellow');
      return false;
    }

    TEST_AGENT_ID = agents[0].id;
    log(`💡 Transfiriendo a: ${agents[0].fullName} (ID: ${TEST_AGENT_ID})`, 'blue');

    const response = await axios.post(
      `${API_URL}/chats/${TEST_CHAT_ID}/transfer`,
      {
        newAgentId: TEST_AGENT_ID,
        reason: 'Prueba E2E de transferencia',
        notes: 'Test automatizado del sistema de gestión de estados',
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
      },
    );

    log('✅ Chat transferido exitosamente', 'green');
    log(`Nuevo agente: ${response.data.assignedAgent?.fullName}`, 'blue');
    log(`Estado: ${response.data.status}/${response.data.subStatus}`, 'blue');
    log(`Transferencias totales: ${response.data.transferCount}`, 'blue');

    return true;
  } catch (error) {
    log(`❌ Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Test 7: Devolución al bot
 */
async function test7_returnToBot() {
  log('\n📋 TEST 7: Devolución al bot', 'cyan');

  if (!TEST_CHAT_ID) {
    log('⚠️  No hay chat de prueba, saltando test', 'yellow');
    return false;
  }

  try {
    const response = await axios.post(
      `${API_URL}/chats/${TEST_CHAT_ID}/return-to-bot`,
      {
        reason: 'solicitud_completada',
        notes: 'Prueba E2E - devolución al bot',
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
      },
    );

    log('✅ Chat devuelto al bot exitosamente', 'green');
    log(`Estado: ${response.data.status}/${response.data.subStatus}`, 'blue');
    log(`Bot activo: ${response.data.isBotActive}`, 'blue');
    log(`PDF generado: ${response.data.pdfGenerated ? 'Sí' : 'No'}`, 'blue');
    log(`Reinicios con bot: ${response.data.botRestartCount}`, 'blue');

    return true;
  } catch (error) {
    log(`❌ Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Test 8: Chats próximos a cerrarse
 */
async function test8_upcomingAutoClose() {
  log('\n📋 TEST 8: Chats próximos a cerrarse (24h)', 'cyan');

  try {
    const response = await axios.get(`${API_URL}/chats/upcoming-auto-close`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      params: { hours: 2 },
    });

    const chats = response.data.data;
    log(`✅ Chats próximos a cerrarse: ${chats.length}`, 'green');

    if (chats.length > 0) {
      log('\nPróximos cierres:', 'blue');
      chats.slice(0, 5).forEach((chat, index) => {
        log(
          `  ${index + 1}. Chat #${chat.id} - ${chat.hoursRemaining}h restantes (${chat.hoursInactive}h inactivo)`,
          'yellow',
        );
      });
    }

    return true;
  } catch (error) {
    log(`❌ Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Test 9: Estadísticas de timeouts
 */
async function test9_timeoutStats() {
  log('\n📋 TEST 9: Estadísticas de timeouts', 'cyan');

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Últimos 7 días

    const response = await axios.get(`${API_URL}/workers/timeout-stats`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    log('✅ Estadísticas obtenidas', 'green');
    log(`Timeouts de agente: ${response.data.agentTimeouts}`, 'blue');
    log(`Timeouts de cliente: ${response.data.clientTimeouts}`, 'blue');
    log(`Total: ${response.data.total}`, 'blue');

    return true;
  } catch (error) {
    log(`❌ Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Test 10: Verificar workers activos
 */
async function test10_workersHealth() {
  log('\n📋 TEST 10: Verificar workers activos', 'cyan');

  try {
    // Verificar que PM2 está corriendo
    log('💡 Verificar manualmente que PM2 está corriendo:', 'blue');
    log('   ssh root@72.61.73.9 "pm2 list"', 'yellow');
    log('   Los workers se ejecutan cada minuto automáticamente', 'yellow');

    const continueTest = await prompt('\n¿PM2 está corriendo? (s/n): ');

    if (continueTest.toLowerCase() === 's') {
      log('✅ Workers verificados manualmente', 'green');
      return true;
    } else {
      log('⚠️  Verificar PM2 en el servidor', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

// ==================== EJECUCIÓN ====================

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  PRUEBAS E2E - Sistema de Gestión de Estados de Chats', 'cyan');
  log('='.repeat(60), 'cyan');

  const tests = [
    { name: 'Autenticación', fn: test1_authentication },
    { name: 'Cola de espera', fn: test2_waitingQueue },
    { name: 'Asignación manual', fn: test3_manualAssignment },
    { name: 'Estado del chat', fn: test4_chatState },
    { name: 'Historial de transiciones', fn: test5_stateTransitions },
    { name: 'Transferencia', fn: test6_transfer },
    { name: 'Devolución al bot', fn: test7_returnToBot },
    { name: 'Próximos cierres', fn: test8_upcomingAutoClose },
    { name: 'Estadísticas timeouts', fn: test9_timeoutStats },
    { name: 'Workers activos', fn: test10_workersHealth },
  ];

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const test of tests) {
    const result = await test.fn();
    if (result === true) {
      results.passed++;
    } else if (result === false) {
      results.failed++;
    } else {
      results.skipped++;
    }

    // Pausa entre tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Resumen
  log('\n' + '='.repeat(60), 'cyan');
  log('  RESUMEN DE PRUEBAS', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`✅ Exitosas: ${results.passed}`, 'green');
  log(`❌ Fallidas: ${results.failed}`, 'red');
  log(`⚠️  Saltadas: ${results.skipped}`, 'yellow');
  log('='.repeat(60) + '\n', 'cyan');

  rl.close();
}

// Iniciar pruebas
runAllTests().catch((error) => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});
