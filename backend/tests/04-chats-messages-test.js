/**
 * TEST 4: CHATS Y MENSAJES
 * Prueba creación de chats, envío de mensajes, asignación de agentes
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

async function testChatsAndMessages(token) {
  console.log('\n' + '='.repeat(60));
  console.log('💬 TESTING CHATS Y MENSAJES');
  console.log('='.repeat(60) + '\n');

  const results = { total: 0, passed: 0, failed: 0 };
  let testChatId = null;

  // Test 1: Listar chats
  try {
    results.total++;
    log('info', 'Test 1: Listar todos los chats');
    
    const response = await axios.get(`${API_URL}/chats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (Array.isArray(response.data.data)) {
      log('success', `${response.data.data.length} chats encontrados`);
      if (response.data.data.length > 0) {
        global.existingChatId = response.data.data[0].id;
        testChatId = response.data.data[0].id;
        log('info', `  Primer chat: ${response.data.data[0].contactName || 'Sin nombre'} (${response.data.data[0].id})`);
      } else {
        log('info', '  No hay chats disponibles');
      }
      results.passed++;
    } else {
      throw new Error('Respuesta no es un array');
    }
  } catch (error) {
    log('error', `Test 1 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 2: Obtener detalles de un chat
  if (testChatId) {
    try {
      results.total++;
      log('info', 'Test 2: Obtener detalles de chat');
      
      const response = await axios.get(`${API_URL}/chats/${testChatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.id === testChatId) {
        log('success', `Chat: ${response.data.contactPhone}`);
        log('info', `  Estado: ${response.data.data.status}`);
        log('info', `  Campaña: ${response.data.data.campaign?.name || 'Sin campaña'}`);
        log('info', `  Agente: ${response.data.agent?.fullName || 'Sin asignar'}`);
        results.passed++;
      } else {
        throw new Error('ID no coincide');
      }
    } catch (error) {
      log('error', `Test 2 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 3: Listar mensajes del chat
  if (testChatId) {
    try {
      results.total++;
      log('info', 'Test 3: Listar mensajes del chat');
      
      const response = await axios.get(`${API_URL}/messages?chatId=${testChatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(response.data.data)) {
        log('success', `${response.data.data.length} mensajes encontrados`);
        if (response.data.data.length > 0) {
          const firstMsg = response.data.data[0];
          log('info', `  Último mensaje: "${(firstMsg.content || firstMsg.text || '[Sin contenido]').substring(0, 50)}..."`);
        }
        results.passed++;
      } else {
        throw new Error('Respuesta no es un array');
      }
    } catch (error) {
      log('error', `Test 3 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 4: Asignar chat a agente
  if (testChatId && global.agenteUserId) {
    try {
      results.total++;
      log('info', 'Test 4: Asignar chat a agente');
      
      const response = await axios.patch(`${API_URL}/chats/${testChatId}/assign`, {
        agentId: global.agenteUserId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      log('success', 'Chat asignado a agente');
      results.passed++;
    } catch (error) {
      if (error.response?.status === 400 || error.response?.data?.message?.includes('ya asignado')) {
        log('success', 'Chat ya asignado (esperado)');
        results.passed++;
      } else {
        log('error', `Test 4 FALLÓ: ${error.response?.data?.message || error.message}`);
        results.failed++;
      }
    }
  }

  // Test 5: Enviar mensaje en el chat
  if (testChatId && global.whatsappNumber) {
    try {
      results.total++;
      log('info', 'Test 5: Enviar mensaje de prueba');
      
      const response = await axios.post(`${API_URL}/messages/send`, {
        chatId: testChatId,
        content: `Mensaje de prueba automatizado - ${new Date().toISOString()}`,
        type: 'text',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.id) {
        log('success', `Mensaje enviado (ID: ${response.data.data.id})`);
        global.testMessageId = response.data.data.id;
        results.passed++;
      } else {
        throw new Error('Mensaje sin ID');
      }
    } catch (error) {
      log('error', `Test 5 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 6: Cambiar estado del chat
  if (testChatId) {
    try {
      results.total++;
      log('info', 'Test 6: Cambiar estado a "active"');
      
      const response = await axios.patch(`${API_URL}/chats/${testChatId}`, {
        status: 'active',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.status === 'active') {
        log('success', 'Estado actualizado a "active"');
        results.passed++;
      } else {
        throw new Error('Estado no actualizado');
      }
    } catch (error) {
      log('error', `Test 6 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 7: Marcar mensaje como leído
  if (global.testMessageId) {
    try {
      results.total++;
      log('info', 'Test 7: Marcar mensaje como leído');
      
      await axios.patch(`${API_URL}/messages/${global.testMessageId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      log('success', 'Mensaje marcado como leído');
      results.passed++;
    } catch (error) {
      log('error', `Test 7 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 8: Filtrar chats por campaña
  if (global.testCampaignId) {
    try {
      results.total++;
      log('info', 'Test 8: Filtrar chats por campaña');
      
      const response = await axios.get(`${API_URL}/chats?campaignId=${global.testCampaignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(response.data.data)) {
        log('success', `${response.data.data.length} chats de la campaña`);
        results.passed++;
      } else {
        throw new Error('Respuesta no es un array');
      }
    } catch (error) {
      log('error', `Test 8 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 9: Filtrar chats por agente
  if (global.agenteUserId) {
    try {
      results.total++;
      log('info', 'Test 9: Filtrar chats por agente');
      
      const response = await axios.get(`${API_URL}/chats?agentId=${global.agenteUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(response.data.data)) {
        log('success', `${response.data.data.length} chats del agente`);
        results.passed++;
      } else {
        throw new Error('Respuesta no es un array');
      }
    } catch (error) {
      log('error', `Test 9 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Resumen
  console.log('\n' + '-'.repeat(60));
  console.log(`📊 RESUMEN CHATS Y MENSAJES:`);
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
  
  testAuth()
    .then(() => testUsers(global.superAdminToken))
    .then(() => testCampaigns(global.superAdminToken))
    .then(() => testChatsAndMessages(global.superAdminToken))
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testChatsAndMessages };
