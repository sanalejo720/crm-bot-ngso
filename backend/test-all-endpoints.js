const axios = require('axios');

// Configuración
const API_URL = 'https://ngso-chat.assoftware.xyz/api/v1';
let authToken = '';
let testUserId = '';
let testCampaignId = '';
let testChatId = '';
let testFlowId = '';

// Colores para consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`
  }[type];
  
  console.log(`${prefix} [${timestamp}] ${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// 1. TESTS DE AUTENTICACIÓN
// =============================================================================

async function test_auth_login() {
  try {
    log('Testing: POST /auth/login', 'info');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@assoftware.xyz',
      password: 'password123'
    });

    if (response.status === 200 && response.data.access_token) {
      authToken = response.data.access_token;
      log('Login exitoso - Token obtenido', 'success');
      return true;
    }
  } catch (error) {
    log(`Login falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

async function test_auth_login_invalid() {
  try {
    log('Testing: POST /auth/login (credenciales inválidas)', 'info');
    
    await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@assoftware.xyz',
      password: 'wrongpassword'
    });

    log('Login debería haber fallado pero no lo hizo', 'error');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      log('Login con credenciales inválidas rechazado correctamente', 'success');
      return true;
    }
    log(`Error inesperado: ${error.message}`, 'error');
    return false;
  }
}

async function test_auth_profile() {
  try {
    log('Testing: GET /auth/profile', 'info');
    
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 200 && response.data.email) {
      log(`Perfil obtenido: ${response.data.email} (${response.data.fullName})`, 'success');
      return true;
    }
  } catch (error) {
    log(`Obtener perfil falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

async function test_auth_without_token() {
  try {
    log('Testing: Acceso sin token (debe fallar)', 'info');
    
    await axios.get(`${API_URL}/users`);

    log('Acceso sin token debería haber fallado', 'error');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      log('Acceso sin token rechazado correctamente', 'success');
      return true;
    }
    log(`Error inesperado: ${error.message}`, 'error');
    return false;
  }
}

// =============================================================================
// 2. TESTS DE USUARIOS
// =============================================================================

async function test_users_list() {
  try {
    log('Testing: GET /users', 'info');
    
    const response = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 200 && Array.isArray(response.data)) {
      log(`Usuarios listados: ${response.data.length} encontrados`, 'success');
      return true;
    }
  } catch (error) {
    log(`Listar usuarios falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

async function test_users_create() {
  try {
    log('Testing: POST /users', 'info');
    
    // Primero obtener un roleId válido
    const rolesResponse = await axios.get(`${API_URL}/roles`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const roleId = rolesResponse.data[0]?.id;
    
    const response = await axios.post(`${API_URL}/users`, {
      email: `test_${Date.now()}@test.com`,
      password: 'Test123!',
      fullName: 'Usuario de Prueba',
      roleId: roleId,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 201) {
      testUserId = response.data.id;
      log(`Usuario creado: ${response.data.email}`, 'success');
      return true;
    }
  } catch (error) {
    log(`Crear usuario falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

async function test_users_update() {
  if (!testUserId) {
    log('No hay usuario de prueba para actualizar', 'warning');
    return false;
  }

  try {
    log('Testing: PATCH /users/:id', 'info');
    
    const response = await axios.patch(`${API_URL}/users/${testUserId}`, {
      fullName: 'Usuario Actualizado'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 200) {
      log('Usuario actualizado correctamente', 'success');
      return true;
    }
  } catch (error) {
    log(`Actualizar usuario falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

// =============================================================================
// 3. TESTS DE CAMPAÑAS
// =============================================================================

async function test_campaigns_list() {
  try {
    log('Testing: GET /campaigns', 'info');
    
    const response = await axios.get(`${API_URL}/campaigns`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 200) {
      log(`Campañas listadas: ${response.data.length} encontradas`, 'success');
      if (response.data.length > 0) {
        testCampaignId = response.data[0].id;
      }
      return true;
    }
  } catch (error) {
    log(`Listar campañas falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

async function test_campaigns_create() {
  try {
    log('Testing: POST /campaigns', 'info');
    
    const response = await axios.post(`${API_URL}/campaigns`, {
      name: `Campaña Test ${Date.now()}`,
      description: 'Campaña de prueba automatizada',
      isActive: true,
      businessHours: {
        enabled: true,
        schedule: {
          monday: { start: '09:00', end: '18:00' },
          tuesday: { start: '09:00', end: '18:00' }
        }
      }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 201) {
      testCampaignId = response.data.id;
      log(`Campaña creada: ${response.data.name}`, 'success');
      return true;
    }
  } catch (error) {
    log(`Crear campaña falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

// =============================================================================
// 4. TESTS DE CHATS
// =============================================================================

async function test_chats_list() {
  try {
    log('Testing: GET /chats', 'info');
    
    const response = await axios.get(`${API_URL}/chats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 200) {
      log(`Chats listados: ${response.data.data?.length || 0} encontrados`, 'success');
      if (response.data.data && response.data.data.length > 0) {
        testChatId = response.data.data[0].id;
      }
      return true;
    }
  } catch (error) {
    log(`Listar chats falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

// =============================================================================
// 5. TESTS DE BOT FLOWS
// =============================================================================

async function test_bot_flows_list() {
  try {
    log('Testing: GET /bot/flows', 'info');
    
    const response = await axios.get(`${API_URL}/bot/flows`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 200) {
      log(`Flujos de bot listados: ${response.data.length} encontrados`, 'success');
      if (response.data.length > 0) {
        testFlowId = response.data[0].id;
      }
      return true;
    }
  } catch (error) {
    log(`Listar flujos falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

async function test_bot_flow_nodes() {
  if (!testFlowId) {
    log('No hay flujo de prueba para verificar nodos', 'warning');
    return false;
  }

  try {
    log('Testing: GET /bot/flows/:id/nodes', 'info');
    
    const response = await axios.get(`${API_URL}/bot/flows/${testFlowId}/nodes`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 200) {
      log(`Nodos del flujo obtenidos: ${response.data.length} nodos`, 'success');
      return true;
    }
  } catch (error) {
    log(`Obtener nodos falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

// =============================================================================
// 6. TESTS DE WHATSAPP
// =============================================================================

async function test_whatsapp_numbers_list() {
  try {
    log('Testing: GET /whatsapp-numbers', 'info');
    
    const response = await axios.get(`${API_URL}/whatsapp-numbers`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status === 200) {
      log(`Números WhatsApp listados: ${response.data.length} encontrados`, 'success');
      return true;
    }
  } catch (error) {
    log(`Listar números WhatsApp falló: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

// =============================================================================
// EJECUTAR TODOS LOS TESTS
// =============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 INICIANDO TESTS AUTOMATIZADOS - CRM WHATSAPP NGS&O');
  console.log('='.repeat(80) + '\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const tests = [
    // Autenticación
    { name: 'Login válido', fn: test_auth_login },
    { name: 'Login inválido', fn: test_auth_login_invalid },
    { name: 'Obtener perfil', fn: test_auth_profile },
    { name: 'Acceso sin token', fn: test_auth_without_token },
    
    // Usuarios
    { name: 'Listar usuarios', fn: test_users_list },
    { name: 'Crear usuario', fn: test_users_create },
    { name: 'Actualizar usuario', fn: test_users_update },
    
    // Campañas
    { name: 'Listar campañas', fn: test_campaigns_list },
    { name: 'Crear campaña', fn: test_campaigns_create },
    
    // Chats
    { name: 'Listar chats', fn: test_chats_list },
    
    // Bot Flows
    { name: 'Listar flujos de bot', fn: test_bot_flows_list },
    { name: 'Obtener nodos de flujo', fn: test_bot_flow_nodes },
    
    // WhatsApp
    { name: 'Listar números WhatsApp', fn: test_whatsapp_numbers_list },
  ];

  for (const test of tests) {
    console.log(`\n${'─'.repeat(80)}`);
    const result = await test.fn();
    results.tests.push({ name: test.name, passed: result });
    
    if (result) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    await sleep(500); // Esperar medio segundo entre tests
  }

  // Resumen final
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE TESTS');
  console.log('='.repeat(80));
  console.log(`Total de tests: ${tests.length}`);
  console.log(`${colors.green}✅ Pasados: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Fallados: ${results.failed}${colors.reset}`);
  console.log(`Porcentaje de éxito: ${((results.passed / tests.length) * 100).toFixed(2)}%`);
  
  console.log('\n📋 Detalle:');
  results.tests.forEach((test, index) => {
    const icon = test.passed ? `${colors.green}✅` : `${colors.red}❌`;
    console.log(`${icon} ${index + 1}. ${test.name}${colors.reset}`);
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Ejecutar
runAllTests().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
