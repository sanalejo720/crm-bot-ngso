/**
 * TEST 2: USUARIOS Y AGENTES
 * Prueba creación, actualización, listado de usuarios y agentes
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

async function testUsers(token) {
  console.log('\n' + '='.repeat(60));
  console.log('👥 TESTING USUARIOS Y AGENTES');
  console.log('='.repeat(60) + '\n');

  const results = { total: 0, passed: 0, failed: 0 };
  let createdUserId = null;

  // Test 1: Listar todos los usuarios
  try {
    results.total++;
    log('info', 'Test 1: Listar usuarios');
    
    const response = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (Array.isArray(response.data.data)) {
      log('success', `${response.data.data.length} usuarios encontrados`);
      results.passed++;
    } else {
      throw new Error('Respuesta no es un array');
    }
  } catch (error) {
    log('error', `Test 1 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 2: Obtener roles disponibles
  try {
    results.total++;
    log('info', 'Test 2: Obtener roles');
    
    const response = await axios.get(`${API_URL}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (Array.isArray(response.data.data) && response.data.data.length > 0) {
      log('success', `${response.data.data.length} roles encontrados`);
      const agenteRole = response.data.data.find(r => r.name === 'Agente');
      if (agenteRole) {
        global.agenteRoleId = agenteRole.id;
        log('info', `  Rol Agente encontrado: ${agenteRole.id}`);
      } else {
        log('info', '  Rol "Agente" no encontrado, usando primer rol disponible');
        global.agenteRoleId = response.data.data[0].id;
      }
      results.passed++;
    } else {
      throw new Error('No hay roles disponibles');
    }
  } catch (error) {
    log('error', `Test 2 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 3: Crear usuario agente de prueba
  if (global.agenteRoleId) {
    try {
      results.total++;
      log('info', 'Test 3: Crear agente de prueba (a.prueba1@prueba.com)');
      
      const response = await axios.post(`${API_URL}/users`, {
        email: 'a.prueba1@prueba.com',
        password: 'password123',
        fullName: 'Agente Prueba 1',
        roleId: global.agenteRoleId,
        isAgent: true,
        maxConcurrentChats: 5,
        status: 'active',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data.id) {
        createdUserId = response.data.data.id;
        log('success', `Agente creado: ${response.data.data.email} (ID: ${response.data.data.id})`);
        global.agenteUserId = response.data.data.id;
        results.passed++;
      } else {
        throw new Error('Usuario creado sin ID');
      }
    } catch (error) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('ya existe')) {
        log('success', 'Agente ya existe (esperado si se ejecutó antes)');
        results.passed++;
      } else {
        log('error', `Test 3 FALLÓ: ${error.response?.data?.message || error.message}`);
        results.failed++;
      }
    }
  }

  // Test 4: Buscar el agente creado
  try {
    results.total++;
    log('info', 'Test 4: Buscar agente por email');
    
    const response = await axios.get(`${API_URL}/users?email=a.prueba1@prueba.com`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const agente = Array.isArray(response.data) 
      ? response.data.find(u => u.email === 'a.prueba1@prueba.com')
      : response.data;

    if (agente) {
      log('success', `Agente encontrado: ${agente.email} - ${agente.fullName}`);
      global.agenteUserId = agente.id;
      results.passed++;
    } else {
      throw new Error('Agente no encontrado');
    }
  } catch (error) {
    log('error', `Test 4 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 5: Actualizar agente
  if (global.agenteUserId) {
    try {
      results.total++;
      log('info', 'Test 5: Actualizar datos del agente');
      
      const response = await axios.patch(`${API_URL}/users/${global.agenteUserId}`, {
        phone: '+573001234567',
        maxConcurrentChats: 10,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.maxConcurrentChats === 10) {
        log('success', 'Agente actualizado correctamente');
        results.passed++;
      } else {
        throw new Error('Actualización no aplicada');
      }
    } catch (error) {
      log('error', `Test 5 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 6: Listar agentes disponibles
  try {
    results.total++;
    log('info', 'Test 6: Listar solo agentes (isAgent=true)');
    
    const response = await axios.get(`${API_URL}/users?isAgent=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const agentes = Array.isArray(response.data) ? response.data : [response.data];
    const agentesActivos = agentes.filter(u => u.isAgent === true);
    
    log('success', `${agentesActivos.length} agentes encontrados`);
    results.passed++;
  } catch (error) {
    log('error', `Test 6 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 7: Login con el agente creado
  try {
    results.total++;
    log('info', 'Test 7: Login con agente de prueba');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'a.prueba1@prueba.com',
      password: 'password123',
    });

    if (response.data.data && response.data.data.accessToken) {
      log('success', 'Login de agente exitoso');
      global.agenteToken = response.data.data.accessToken;
      results.passed++;
    } else {
      throw new Error('Sin token en respuesta');
    }
  } catch (error) {
    log('error', `Test 7 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Resumen
  console.log('\n' + '-'.repeat(60));
  console.log(`📊 RESUMEN USUARIOS:`);
  console.log(`   Total: ${results.total}`);
  console.log(`   ${colors.green}Exitosos: ${results.passed}${colors.reset}`);
  console.log(`   ${colors.red}Fallidos: ${results.failed}${colors.reset}`);
  console.log(`   Porcentaje: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('-'.repeat(60) + '\n');

  return results;
}

if (require.main === module) {
  const { testAuth } = require('./01-auth-test');
  
  testAuth()
    .then(() => testUsers(global.superAdminToken))
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testUsers };
