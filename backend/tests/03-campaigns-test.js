/**
 * TEST 3: CAMPAÑAS
 * Prueba creación, actualización, asignación de números WhatsApp
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

async function testCampaigns(token) {
  console.log('\n' + '='.repeat(60));
  console.log('📢 TESTING CAMPAÑAS');
  console.log('='.repeat(60) + '\n');

  const results = { total: 0, passed: 0, failed: 0 };
  let testCampaignId = null;

  // Test 1: Listar campañas
  try {
    results.total++;
    log('info', 'Test 1: Listar todas las campañas');
    
    const response = await axios.get(`${API_URL}/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (Array.isArray(response.data.data)) {
      log('success', `${response.data.data.length} campañas encontradas`);
      if (response.data.data.length > 0) {
        global.existingCampaignId = response.data.data[0].id;
        log('info', `  Primera campaña: ${response.data.data[0].name || 'Sin nombre'} (${response.data.data[0].id})`);
      } else {
        log('info', '  No hay campañas disponibles');
      }
      results.passed++;
    } else {
      throw new Error('Respuesta no es un array');
    }
  } catch (error) {
    log('error', `Test 1 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 2: Crear campaña de prueba
  try {
    results.total++;
    log('info', 'Test 2: Crear campaña de prueba');
    
    const response = await axios.post(`${API_URL}/campaigns`, {
      name: 'Campaña Test Automatizado',
      description: 'Campaña creada por tests automatizados',
      status: 'active',
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.data.id) {
      testCampaignId = response.data.data.id;
      global.testCampaignId = response.data.data.id;
      log('success', `Campaña creada: ${response.data.data.name} (${response.data.data.id})`);
      results.passed++;
    } else {
      throw new Error('Campaña creada sin ID');
    }
  } catch (error) {
    if (error.response?.status === 409) {
      log('success', 'Campaña ya existe (esperado)');
      results.passed++;
    } else {
      log('error', `Test 2 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 3: Obtener números WhatsApp disponibles
  try {
    results.total++;
    log('info', 'Test 3: Listar números WhatsApp');
    
    const response = await axios.get(`${API_URL}/whatsapp/numbers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (Array.isArray(response.data.data) && response.data.length > 0) {
      global.whatsappNumber = response.data.data[0];
      log('success', `${response.data.data.length} números WhatsApp encontrados`);
      log('info', `  Primer número: ${response.data[0].phoneNumber} (${response.data[0].status})`);
      results.passed++;
    } else {
      throw new Error('No hay números WhatsApp disponibles');
    }
  } catch (error) {
    log('error', `Test 3 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 4: Asignar número a campaña
  if (testCampaignId && global.whatsappNumber) {
    try {
      results.total++;
      log('info', 'Test 4: Asignar número WhatsApp a campaña');
      
      const response = await axios.patch(`${API_URL}/campaigns/${testCampaignId}`, {
        whatsappNumberId: global.whatsappNumber.id,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.whatsappNumberId === global.whatsappNumber.id) {
        log('success', 'Número asignado correctamente');
        results.passed++;
      } else {
        throw new Error('Asignación no aplicada');
      }
    } catch (error) {
      log('error', `Test 4 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 5: Asignar agente a campaña
  if (testCampaignId && global.agenteUserId) {
    try {
      results.total++;
      log('info', 'Test 5: Asignar agente a campaña');
      
      const response = await axios.post(`${API_URL}/campaigns/${testCampaignId}/agents`, {
        agentId: global.agenteUserId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      log('success', 'Agente asignado a campaña');
      results.passed++;
    } catch (error) {
      if (error.response?.status === 409) {
        log('success', 'Agente ya asignado (esperado)');
        results.passed++;
      } else {
        log('error', `Test 5 FALLÓ: ${error.response?.data?.message || error.message}`);
        results.failed++;
      }
    }
  }

  // Test 6: Obtener detalles de campaña
  if (testCampaignId) {
    try {
      results.total++;
      log('info', 'Test 6: Obtener detalles de campaña');
      
      const response = await axios.get(`${API_URL}/campaigns/${testCampaignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.id === testCampaignId) {
        log('success', `Campaña: ${response.data.data.name}`);
        log('info', `  WhatsApp: ${response.data.whatsappNumber?.phoneNumber || 'No asignado'}`);
        log('info', `  Agentes: ${response.data.agents?.length || 0}`);
        results.passed++;
      } else {
        throw new Error('ID no coincide');
      }
    } catch (error) {
      log('error', `Test 6 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 7: Actualizar estado de campaña
  if (testCampaignId) {
    try {
      results.total++;
      log('info', 'Test 7: Pausar campaña');
      
      const response = await axios.patch(`${API_URL}/campaigns/${testCampaignId}`, {
        status: 'paused',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.status === 'paused') {
        log('success', 'Campaña pausada');
        results.passed++;
      } else {
        throw new Error('Estado no actualizado');
      }
    } catch (error) {
      log('error', `Test 7 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 8: Reactivar campaña
  if (testCampaignId) {
    try {
      results.total++;
      log('info', 'Test 8: Reactivar campaña');
      
      const response = await axios.patch(`${API_URL}/campaigns/${testCampaignId}`, {
        status: 'active',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.status === 'active') {
        log('success', 'Campaña reactivada');
        results.passed++;
      } else {
        throw new Error('Estado no actualizado');
      }
    } catch (error) {
      log('error', `Test 8 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Resumen
  console.log('\n' + '-'.repeat(60));
  console.log(`📊 RESUMEN CAMPAÑAS:`);
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
  
  testAuth()
    .then(() => testUsers(global.superAdminToken))
    .then(() => testCampaigns(global.superAdminToken))
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testCampaigns };
