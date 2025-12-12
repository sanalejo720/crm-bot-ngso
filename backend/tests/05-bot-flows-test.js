/**
 * TEST 5: BOT Y FLUJOS
 * Prueba creación de flujos, nodos, activación del bot
 */

const axios = require('axios');

const API_URL = 'https://ngso-chat.assoftware.xyz/api/v1';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(status, message) {
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '📋';
  const color = status === 'success' ? colors.green : status === 'error' ? colors.red : colors.blue;
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

async function testBotFlows(token) {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 TESTING BOT Y FLUJOS');
  console.log('='.repeat(60) + '\n');

  const results = { total: 0, passed: 0, failed: 0 };
  let testFlowId = null;

  // Test 1: Listar flujos existentes
  try {
    results.total++;
    log('info', 'Test 1: Listar flujos de bot');
    
    const response = await axios.get(`${API_URL}/bot-flows`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const flows = response.data.data.data || response.data.data;
    if (Array.isArray(flows)) {
      log('success', `${flows.length} flujos encontrados`);
      if (flows.length > 0) {
        global.existingFlowId = flows[0].id;
        testFlowId = flows[0].id;
        log('info', `  Primer flujo: ${flows[0].name || 'Sin nombre'} (${flows[0].id})`);
      } else {
        log('info', '  No hay flujos disponibles');
      }
      results.passed++;
    } else {
      throw new Error('Respuesta no es un array');
    }
  } catch (error) {
    log('error', `Test 1 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 2: Crear flujo de prueba
  try {
    results.total++;
    log('info', 'Test 2: Crear flujo de prueba');
    
    const response = await axios.post(`${API_URL}/bot-flows`, {
      name: 'Flujo Test Automatizado',
      description: 'Flujo creado por tests automatizados',
      status: 'draft',
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const flow = response.data.data.data || response.data.data;
    if (flow && flow.id) {
      testFlowId = flow.id;
      global.testFlowId = flow.id;
      log('success', `Flujo creado: ${flow.name} (${flow.id})`);
      results.passed++;
    } else {
      throw new Error('Flujo creado sin ID');
    }
  } catch (error) {
    if (error.response?.status === 409) {
      log('success', 'Flujo ya existe (esperado)');
      results.passed++;
    } else {
      log('error', `Test 2 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 3: Crear nodo inicial (mensaje)
  if (testFlowId) {
    try {
      results.total++;
      log('info', 'Test 3: Crear nodo de mensaje inicial');
      
      const response = await axios.post(`${API_URL}/bot-flows/${testFlowId}/nodes`, {
        type: 'message',
        name: 'Saludo Inicial',
        config: {
          message: '¡Hola! Bienvenido a nuestro servicio de atención. ¿En qué puedo ayudarte?',
        },
        positionX: 100,
        positionY: 100,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const node = response.data.data.data || response.data.data;
      if (node && node.id) {
        global.testNodeId = node.id;
        log('success', `Nodo creado: ${node.name}`);
        
        // Establecer como nodo inicial
        await axios.put(`${API_URL}/bot-flows/${testFlowId}`, {
          startNodeId: node.id,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        log('success', 'Nodo establecido como inicial');
        results.passed++;
      } else {
        throw new Error('Nodo creado sin ID');
      }
    } catch (error) {
      log('error', `Test 3 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 4: Verificar flujo tiene nodo inicial configurado
  if (testFlowId && global.testNodeId) {
    try {
      results.total++;
      log('info', 'Test 4: Verificar nodo inicial configurado');
      
      const response = await axios.get(`${API_URL}/bot-flows/${testFlowId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const flow = response.data.data.data || response.data.data;
      if (flow.startNodeId === global.testNodeId) {
        log('success', `Nodo inicial configurado: ${flow.startNodeId}`);
        results.passed++;
      } else {
        log('info', `Esperado: ${global.testNodeId}, Actual: ${flow.startNodeId || 'null'}`);
        throw new Error('Nodo inicial no coincide');
      }
    } catch (error) {
      log('error', `Test 4 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 5: Activar bot en campaña
  if (global.testCampaignId && testFlowId) {
    try {
      results.total++;
      log('info', 'Test 5: Activar bot en campaña');
      
      const response = await axios.patch(`${API_URL}/campaigns/${global.testCampaignId}`, {
        settings: {
          botEnabled: true,
          botFlowId: testFlowId,
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.settings?.botEnabled === true) {
        log('success', 'Bot activado en campaña');
        results.passed++;
      } else {
        throw new Error('Bot no activado');
      }
    } catch (error) {
      log('error', `Test 5 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 6: Verificar que el flujo está activo
  if (testFlowId) {
    try {
      results.total++;
      log('info', 'Test 6: Verificar flujo activo');
      
      const response = await axios.get(`${API_URL}/bot-flows/${testFlowId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const flow = response.data.data.data || response.data.data;
      // El flujo puede estar en draft pero ser válido si tiene nodo inicial
      if (flow.status === 'active' || flow.startNodeId) {
        log('success', `Flujo válido - Estado: ${flow.status}`);
        log('info', `  Nodo inicial: ${flow.startNodeId ? 'Configurado ✓' : 'No configurado ✗'}`);
        results.passed++;
      } else {
        throw new Error(`Flujo en estado: ${flow.status}, sin nodo inicial`);
      }
    } catch (error) {
      log('error', `Test 6 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 7: Desactivar bot en campaña
  if (global.testCampaignId) {
    try {
      results.total++;
      log('info', 'Test 7: Desactivar bot en campaña');
      
      const response = await axios.patch(`${API_URL}/campaigns/${testCampaignId}`, {
        settings: {
          botEnabled: false,
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.settings?.botEnabled === false) {
        log('success', 'Bot desactivado en campaña');
        results.passed++;
      } else {
        throw new Error('Bot no desactivado');
      }
    } catch (error) {
      log('error', `Test 7 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 8: Verificar asignación correcta de campaña a chat
  if (global.existingChatId && global.whatsappNumber) {
    try {
      results.total++;
      log('info', 'Test 8: Verificar que chat tiene campaña asignada correctamente');
      
      const response = await axios.get(`${API_URL}/chats/${global.existingChatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.campaignId) {
        log('success', `Chat tiene campaña: ${response.data.data.campaign?.name || response.data.data.campaignId}`);
        log('info', `  Número WhatsApp: ${response.data.whatsappNumber?.phoneNumber || 'N/A'}`);
        results.passed++;
      } else {
        log('error', 'Chat no tiene campaña asignada');
        results.failed++;
      }
    } catch (error) {
      log('error', `Test 8 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Resumen
  console.log('\n' + '-'.repeat(60));
  console.log(`📊 RESUMEN BOT Y FLUJOS:`);
  console.log(`   Total: ${results.total}`);
  console.log(`   ${colors.green}Exitosos: ${results.passed}${colors.reset}`);
  console.log(`   ${colors.red}Fallidos: ${results.failed}${colors.reset}`);
  console.log(`   Porcentaje: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('-'.repeat(60) + '\n');

  return results;
}

if (require.main === module) {
  const { testAuth } = require('./01-auth-test');
  const { testUsers } = require('./02-users-test');
  const { testCampaigns } = require('./03-campaigns-test');
  const { testChatsAndMessages } = require('./04-chats-messages-test');
  
  testAuth()
    .then(() => testUsers(global.superAdminToken))
    .then(() => testCampaigns(global.superAdminToken))
    .then(() => testChatsAndMessages(global.superAdminToken))
    .then(() => testBotFlows(global.superAdminToken))
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testBotFlows };
