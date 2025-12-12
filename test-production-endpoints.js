#!/usr/bin/env node

/**
 * Script de Testing Completo - Endpoints de Producción
 * CRM NGSO WhatsApp - Hostinger
 * 
 * Este script prueba todos los endpoints principales del sistema
 * para verificar que todo funciona correctamente después del despliegue.
 */

const axios = require('axios');
const https = require('https');

// Configuración
const BASE_URL = process.env.API_URL || 'https://ngso-chat.assoftware.xyz/api/v1';
const TIMEOUT = 10000; // 10 segundos

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Configurar axios para aceptar certificados SSL
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // Solo para testing, en producción usar true
  }),
});

// Variables globales
let authToken = null;
let refreshToken = null;
let userId = null;
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
};

// Utilidades
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logSection(title) {
  console.log('');
  log('='.repeat(70), 'blue');
  log(`  ${title}`, 'blue');
  log('='.repeat(70), 'blue');
}

async function testEndpoint(name, method, path, data = null, requiresAuth = false) {
  testResults.total++;

  try {
    const config = {
      method,
      url: path,
      data,
    };

    if (requiresAuth && authToken) {
      config.headers = {
        Authorization: `Bearer ${authToken}`,
      };
    }

    const startTime = Date.now();
    const response = await axiosInstance(config);
    const duration = Date.now() - startTime;

    testResults.passed++;
    logSuccess(`${name} - ${response.status} (${duration}ms)`);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    testResults.failed++;
    const status = error.response?.status || 'NO RESPONSE';
    const message = error.response?.data?.message || error.message;
    logError(`${name} - ${status}: ${message}`);
    return { success: false, error: message, status };
  }
}

// ========================================
// TESTS DE ENDPOINTS
// ========================================

async function testHealthEndpoints() {
  logSection('1. HEALTH & STATUS ENDPOINTS');

  await testEndpoint('Health Check', 'GET', '/health');
  await testEndpoint('API Status', 'GET', '/');
}

async function testAuthEndpoints() {
  logSection('2. AUTHENTICATION ENDPOINTS');

  // Test de login
  const loginResult = await testEndpoint('Login', 'POST', '/auth/login', {
    email: 'admin@crm.com',
    password: 'Admin123!',
  });

  if (loginResult.success && loginResult.data.accessToken) {
    authToken = loginResult.data.accessToken;
    refreshToken = loginResult.data.refreshToken;
    userId = loginResult.data.user?.id;
    logInfo(`Token obtenido: ${authToken.substring(0, 20)}...`);
  } else {
    logWarning('No se pudo obtener token. Tests que requieren auth serán omitidos.');
  }

  // Test de refresh token (si tenemos tokens)
  if (refreshToken) {
    await testEndpoint('Refresh Token', 'POST', '/auth/refresh', {
      refreshToken,
    });
  }

  // Test de perfil (requiere auth)
  if (authToken) {
    await testEndpoint('Get Profile', 'GET', '/auth/profile', null, true);
  }
}

async function testUsersEndpoints() {
  logSection('3. USERS ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de usuarios omitidos (requieren autenticación)');
    testResults.skipped += 3;
    return;
  }

  await testEndpoint('List Users', 'GET', '/users', null, true);
  await testEndpoint('Get Current User', 'GET', `/users/${userId}`, null, true);
  await testEndpoint('Get User Stats', 'GET', `/users/${userId}/stats`, null, true);
}

async function testRolesEndpoints() {
  logSection('4. ROLES & PERMISSIONS ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de roles omitidos (requieren autenticación)');
    testResults.skipped += 2;
    return;
  }

  await testEndpoint('List Roles', 'GET', '/roles', null, true);
  await testEndpoint('List Permissions', 'GET', '/roles/permissions', null, true);
}

async function testCampaignsEndpoints() {
  logSection('5. CAMPAIGNS ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de campañas omitidos (requieren autenticación)');
    testResults.skipped += 2;
    return;
  }

  await testEndpoint('List Campaigns', 'GET', '/campaigns', null, true);
  await testEndpoint('Campaign Stats', 'GET', '/campaigns/stats', null, true);
}

async function testWhatsAppEndpoints() {
  logSection('6. WHATSAPP ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de WhatsApp omitidos (requieren autenticación)');
    testResults.skipped += 2;
    return;
  }

  await testEndpoint('List WhatsApp Numbers', 'GET', '/whatsapp/numbers', null, true);
  await testEndpoint('WhatsApp Status', 'GET', '/whatsapp/status', null, true);
}

async function testChatsEndpoints() {
  logSection('7. CHATS ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de chats omitidos (requieren autenticación)');
    testResults.skipped += 2;
    return;
  }

  await testEndpoint('List Chats', 'GET', '/chats', null, true);
  await testEndpoint('Chat Stats', 'GET', '/chats/stats', null, true);
}

async function testMessagesEndpoints() {
  logSection('8. MESSAGES ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de mensajes omitidos (requieren autenticación)');
    testResults.skipped += 1;
    return;
  }

  await testEndpoint('Message Stats', 'GET', '/messages/stats', null, true);
}

async function testQueueEndpoints() {
  logSection('9. QUEUE ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de cola omitidos (requieren autenticación)');
    testResults.skipped += 2;
    return;
  }

  await testEndpoint('Queue Stats', 'GET', '/queue/stats', null, true);
  await testEndpoint('Queue Status', 'GET', '/queue/status', null, true);
}

async function testBotEndpoints() {
  logSection('10. BOT ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de bot omitidos (requieren autenticación)');
    testResults.skipped += 1;
    return;
  }

  await testEndpoint('List Bot Flows', 'GET', '/bot/flows', null, true);
}

async function testClientsEndpoints() {
  logSection('11. CLIENTS (CRM) ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de clientes omitidos (requieren autenticación)');
    testResults.skipped += 2;
    return;
  }

  await testEndpoint('List Clients', 'GET', '/clients', null, true);
  await testEndpoint('Client Stats', 'GET', '/clients/stats', null, true);
}

async function testDebtorsEndpoints() {
  logSection('12. DEBTORS ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de deudores omitidos (requieren autenticación)');
    testResults.skipped += 2;
    return;
  }

  await testEndpoint('List Debtors', 'GET', '/debtors', null, true);
  await testEndpoint('Debtors Stats', 'GET', '/debtors/stats', null, true);
}

async function testTasksEndpoints() {
  logSection('13. TASKS ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de tareas omitidos (requieren autenticación)');
    testResults.skipped += 2;
    return;
  }

  await testEndpoint('List Tasks', 'GET', '/tasks', null, true);
  await testEndpoint('My Tasks', 'GET', '/tasks/my-tasks', null, true);
}

async function testReportsEndpoints() {
  logSection('14. REPORTS ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de reportes omitidos (requieren autenticación)');
    testResults.skipped += 3;
    return;
  }

  await testEndpoint('System Reports', 'GET', '/reports/system', null, true);
  await testEndpoint('Agent Reports', 'GET', '/reports/agents', null, true);
  await testEndpoint('Campaign Reports', 'GET', '/reports/campaigns', null, true);
}

async function testAuditEndpoints() {
  logSection('15. AUDIT ENDPOINTS');

  if (!authToken) {
    logWarning('Tests de auditoría omitidos (requieren autenticación)');
    testResults.skipped += 1;
    return;
  }

  await testEndpoint('Audit Logs', 'GET', '/audit', null, true);
}

// ========================================
// FUNCIÓN PRINCIPAL
// ========================================

async function runAllTests() {
  console.log('');
  log('╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     TESTING COMPLETO - ENDPOINTS DE PRODUCCIÓN                    ║', 'cyan');
  log('║     CRM NGSO WhatsApp - Hostinger                                 ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Timeout: ${TIMEOUT}ms`);
  console.log('');

  const startTime = Date.now();

  try {
    // Ejecutar todos los tests
    await testHealthEndpoints();
    await testAuthEndpoints();
    await testUsersEndpoints();
    await testRolesEndpoints();
    await testCampaignsEndpoints();
    await testWhatsAppEndpoints();
    await testChatsEndpoints();
    await testMessagesEndpoints();
    await testQueueEndpoints();
    await testBotEndpoints();
    await testClientsEndpoints();
    await testDebtorsEndpoints();
    await testTasksEndpoints();
    await testReportsEndpoints();
    await testAuditEndpoints();

  } catch (error) {
    logError(`Error fatal durante los tests: ${error.message}`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Resumen final
  console.log('');
  logSection('RESUMEN DE RESULTADOS');
  console.log('');
  log(`  Total de tests:      ${testResults.total}`, 'cyan');
  log(`  ✅ Exitosos:         ${testResults.passed}`, 'green');
  log(`  ❌ Fallidos:         ${testResults.failed}`, 'red');
  log(`  ⏭️  Omitidos:         ${testResults.skipped}`, 'yellow');
  console.log('');
  log(`  Tiempo total:        ${duration}s`, 'cyan');
  
  const successRate = testResults.total > 0 
    ? ((testResults.passed / testResults.total) * 100).toFixed(2)
    : 0;
  
  console.log('');
  if (successRate >= 80) {
    log(`  🎉 Tasa de éxito:    ${successRate}%`, 'green');
    console.log('');
    logSuccess('¡Sistema funcionando correctamente!');
  } else if (successRate >= 50) {
    log(`  ⚠️  Tasa de éxito:    ${successRate}%`, 'yellow');
    console.log('');
    logWarning('Algunos endpoints tienen problemas. Revisar logs.');
  } else {
    log(`  ❌ Tasa de éxito:    ${successRate}%`, 'red');
    console.log('');
    logError('Sistema con problemas críticos. Revisar configuración.');
  }
  
  console.log('');
  log('═'.repeat(70), 'blue');
  console.log('');

  // Código de salida
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Ejecutar tests
runAllTests().catch((error) => {
  logError(`Error fatal: ${error.message}`);
  process.exit(1);
});
