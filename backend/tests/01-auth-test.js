/**
 * TEST 1: AUTENTICACIÓN
 * Prueba login, registro, refresh token, etc.
 */

const axios = require('axios');

const API_URL = 'https://ngso-chat.assoftware.xyz/api/v1';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(status, message) {
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'info' ? '📋' : '⏳';
  const color = status === 'success' ? colors.green : status === 'error' ? colors.red : colors.blue;
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

async function testAuth() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 TESTING AUTENTICACIÓN');
  console.log('='.repeat(60) + '\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  // Test 1: Login con Super Admin
  try {
    results.total++;
    log('info', 'Test 1: Login Super Admin (admin@assoftware.xyz)');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@assoftware.xyz',
      password: 'password123',
    });

    if (response.data.data && response.data.data.accessToken && response.data.data.user) {
      log('success', `Login exitoso - Token: ${response.data.data.accessToken.substring(0, 20)}...`);
      log('success', `Usuario: ${response.data.data.user.email} - Rol: ${response.data.data.user.role?.name || 'N/A'}`);
      results.passed++;
      
      // Guardar token para otros tests
      global.superAdminToken = response.data.data.accessToken;
      global.superAdminUser = response.data.data.user;
    } else {
      throw new Error('Respuesta sin token o usuario');
    }
  } catch (error) {
    log('error', `Test 1 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 2: Login con Administrador
  try {
    results.total++;
    log('info', 'Test 2: Login Administrador (san.alejo0720@gmail.com)');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'san.alejo0720@gmail.com',
      password: 'password123',
    });

    if (response.data.data && response.data.data.accessToken && response.data.data.user) {
      log('success', `Login exitoso - Usuario: ${response.data.data.user.email}`);
      results.passed++;
      global.adminToken = response.data.data.accessToken;
    } else {
      throw new Error('Respuesta sin token o usuario');
    }
  } catch (error) {
    log('error', `Test 2 FALLÓ: ${error.response?.data?.message || error.message}`);
    results.failed++;
  }

  // Test 3: Login con credenciales incorrectas
  try {
    results.total++;
    log('info', 'Test 3: Login con contraseña incorrecta (debe fallar)');
    
    await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@assoftware.xyz',
      password: 'wrongpassword',
    });

    log('error', 'Test 3 FALLÓ: Debería haber rechazado credenciales incorrectas');
    results.failed++;
  } catch (error) {
    if (error.response?.status === 401) {
      log('success', 'Credenciales incorrectas rechazadas correctamente');
      results.passed++;
    } else {
      log('error', `Test 3 FALLÓ: Error inesperado - ${error.message}`);
      results.failed++;
    }
  }

  // Test 4: Login con email inexistente
  try {
    results.total++;
    log('info', 'Test 4: Login con email inexistente (debe fallar)');
    
    await axios.post(`${API_URL}/auth/login`, {
      email: 'noexiste@test.com',
      password: 'password123',
    });

    log('error', 'Test 4 FALLÓ: Debería haber rechazado email inexistente');
    results.failed++;
  } catch (error) {
    if (error.response?.status === 401) {
      log('success', 'Email inexistente rechazado correctamente');
      results.passed++;
    } else {
      log('error', `Test 4 FALLÓ: Error inesperado - ${error.message}`);
      results.failed++;
    }
  }

  // Test 5: Verificar perfil con token
  if (global.superAdminToken) {
    try {
      results.total++;
      log('info', 'Test 5: Obtener perfil del usuario autenticado');
      
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${global.superAdminToken}`,
        },
      });

      if (response.data.email === 'admin@assoftware.xyz') {
        log('success', `Perfil obtenido: ${response.data.data.email}`);
        results.passed++;
      } else {
        throw new Error('Perfil no coincide');
      }
    } catch (error) {
      log('error', `Test 5 FALLÓ: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
  }

  // Test 6: Acceso sin token (debe fallar)
  try {
    results.total++;
    log('info', 'Test 6: Acceso sin token (debe fallar)');
    
    await axios.get(`${API_URL}/auth/me`);

    log('error', 'Test 6 FALLÓ: Debería haber rechazado acceso sin token');
    results.failed++;
  } catch (error) {
    if (error.response?.status === 401) {
      log('success', 'Acceso sin token rechazado correctamente');
      results.passed++;
    } else {
      log('error', `Test 6 FALLÓ: Error inesperado - ${error.message}`);
      results.failed++;
    }
  }

  // Resumen
  console.log('\n' + '-'.repeat(60));
  console.log(`📊 RESUMEN AUTENTICACIÓN:`);
  console.log(`   Total: ${results.total}`);
  console.log(`   ${colors.green}Exitosos: ${results.passed}${colors.reset}`);
  console.log(`   ${colors.red}Fallidos: ${results.failed}${colors.reset}`);
  console.log(`   Porcentaje: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('-'.repeat(60) + '\n');

  return results;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testAuth()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testAuth };
