/**
 * =====================================================
 * SCRIPT DE PRUEBAS FRONTEND - API CALLS
 * NGS&O CRM Gestión - Desarrollado por AS Software
 * =====================================================
 * 
 * Este script prueba todas las llamadas a la API desde el frontend
 * Ejecutar en la consola del navegador (F12)
 */

const API_BASE = 'http://localhost:3000/api/v1';
let globalToken = null;
let globalUserId = null;

// Utilidad para hacer requests
async function apiRequest(endpoint, method = 'GET', data = null, useToken = true) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (useToken && globalToken) {
    options.headers['Authorization'] = `Bearer ${globalToken}`;
  }

  if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Error ${response.status}:`, result);
      return { error: true, status: response.status, data: result };
    }
    
    return { error: false, status: response.status, data: result };
  } catch (error) {
    console.error('❌ Network error:', error);
    return { error: true, message: error.message };
  }
}

// =====================================================
// TEST SUITE - AUTENTICACIÓN
// =====================================================
async function testAuth() {
  console.log('\n%c========================================', 'color: cyan');
  console.log('%c🔐 PRUEBAS DE AUTENTICACIÓN', 'color: cyan; font-weight: bold');
  console.log('%c========================================\n', 'color: cyan');

  // TEST 1: Login
  console.log('%cTEST 1: Login con credenciales válidas', 'color: yellow');
  const loginResult = await apiRequest('/auth/login', 'POST', {
    email: 'juan@crm.com',
    password: 'password123'
  }, false);

  if (!loginResult.error) {
    globalToken = loginResult.data.data.accessToken;
    globalUserId = loginResult.data.data.user.id;
    console.log('%c✅ Login exitoso', 'color: green');
    console.log('Token:', globalToken.substring(0, 30) + '...');
    console.log('Usuario:', loginResult.data.data.user.firstName, loginResult.data.data.user.lastName);
  } else {
    console.log('%c❌ Login fallido', 'color: red');
    return false;
  }

  // TEST 2: Obtener perfil
  console.log('\n%cTEST 2: Obtener perfil del usuario', 'color: yellow');
  const profileResult = await apiRequest('/auth/me', 'GET');
  
  if (!profileResult.error) {
    console.log('%c✅ Perfil obtenido', 'color: green');
    console.log('Datos:', profileResult.data);
  } else {
    console.log('%c❌ Error obteniendo perfil', 'color: red');
  }

  return true;
}

// =====================================================
// TEST SUITE - CHATS
// =====================================================
async function testChats() {
  console.log('\n%c========================================', 'color: cyan');
  console.log('%c💬 PRUEBAS DE CHATS', 'color: cyan; font-weight: bold');
  console.log('%c========================================\n', 'color: cyan');

  // TEST 1: Obtener mis chats
  console.log('%cTEST 1: Obtener mis chats asignados', 'color: yellow');
  const myChatsResult = await apiRequest('/chats/my-chats', 'GET');
  
  if (!myChatsResult.error) {
    console.log('%c✅ Mis chats obtenidos', 'color: green');
    console.log(`Total: ${myChatsResult.data.data.length} chats`);
    console.table(myChatsResult.data.data.map(chat => ({
      ID: chat.id.substring(0, 8),
      Contacto: chat.contactName,
      Estado: chat.status,
      Mensajes: chat.unreadCount || 0
    })));
  } else {
    console.log('%c❌ Error obteniendo chats', 'color: red');
  }

  // TEST 2: Crear nuevo chat
  console.log('\n%cTEST 2: Crear nuevo chat', 'color: yellow');
  const newChatResult = await apiRequest('/chats', 'POST', {
    campaignId: 'e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d',
    whatsappNumberId: 'a2c91e8b-1f8d-4e77-8d8c-ec9e4e5d6d4f',
    contactPhone: `+521${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    contactName: `Cliente Test ${Math.floor(Math.random() * 999)}`,
    initialMessage: 'Hola, necesito ayuda',
    channel: 'whatsapp'
  });

  if (!newChatResult.error) {
    console.log('%c✅ Chat creado exitosamente', 'color: green');
    console.log('Chat ID:', newChatResult.data.data.id);
    return newChatResult.data.data.id;
  } else {
    console.log('%c❌ Error creando chat', 'color: red');
    return null;
  }
}

// =====================================================
// TEST SUITE - MENSAJES
// =====================================================
async function testMessages(chatId) {
  console.log('\n%c========================================', 'color: cyan');
  console.log('%c📨 PRUEBAS DE MENSAJES', 'color: cyan; font-weight: bold');
  console.log('%c========================================\n', 'color: cyan');

  if (!chatId) {
    console.log('%c⚠️ No hay chat ID para probar mensajes', 'color: yellow');
    return;
  }

  // TEST 1: Obtener mensajes del chat
  console.log('%cTEST 1: Obtener mensajes del chat', 'color: yellow');
  const messagesResult = await apiRequest(`/messages/chat/${chatId}`, 'GET');
  
  if (!messagesResult.error) {
    console.log('%c✅ Mensajes obtenidos', 'color: green');
    console.log(`Total: ${messagesResult.data.data.length} mensajes`);
  } else {
    console.log('%c❌ Error obteniendo mensajes', 'color: red');
  }

  // TEST 2: Enviar mensaje
  console.log('\n%cTEST 2: Enviar mensaje', 'color: yellow');
  const sendResult = await apiRequest('/messages/send', 'POST', {
    chatId: chatId,
    content: `Mensaje de prueba enviado a las ${new Date().toLocaleTimeString()}`
  });

  if (!sendResult.error) {
    console.log('%c✅ Mensaje enviado exitosamente', 'color: green');
    console.log('Contenido:', sendResult.data.data.content);
  } else {
    console.log('%c❌ Error enviando mensaje', 'color: red');
  }
}

// =====================================================
// TEST SUITE - REPORTES
// =====================================================
async function testReports() {
  console.log('\n%c========================================', 'color: cyan');
  console.log('%c📊 PRUEBAS DE REPORTES', 'color: cyan; font-weight: bold');
  console.log('%c========================================\n', 'color: cyan');

  // TEST 1: Estadísticas del agente
  console.log('%cTEST 1: Obtener estadísticas del agente', 'color: yellow');
  const statsResult = await apiRequest('/reports/agent/stats', 'GET');
  
  if (!statsResult.error) {
    console.log('%c✅ Estadísticas obtenidas', 'color: green');
    console.table({
      'Chats Asignados': statsResult.data.data.chatsAssigned || 0,
      'Chats Activos': statsResult.data.data.chatsActive || 0,
      'Chats Cerrados': statsResult.data.data.chatsClosed || 0,
      'Mensajes Enviados': statsResult.data.data.messagesSent || 0
    });
  } else {
    console.log('%c❌ Error obteniendo estadísticas', 'color: red');
  }

  // TEST 2: Métricas del sistema
  console.log('\n%cTEST 2: Obtener métricas del sistema', 'color: yellow');
  const metricsResult = await apiRequest('/reports/system', 'GET');
  
  if (!metricsResult.error) {
    console.log('%c✅ Métricas obtenidas', 'color: green');
    console.log('Métricas:', metricsResult.data);
  } else {
    console.log('%c❌ Error obteniendo métricas', 'color: red');
  }
}

// =====================================================
// TEST SUITE - CAMPAÑAS
// =====================================================
async function testCampaigns() {
  console.log('\n%c========================================', 'color: cyan');
  console.log('%c📢 PRUEBAS DE CAMPAÑAS', 'color: cyan; font-weight: bold');
  console.log('%c========================================\n', 'color: cyan');

  // TEST 1: Obtener campañas activas
  console.log('%cTEST 1: Obtener campañas activas', 'color: yellow');
  const campaignsResult = await apiRequest('/campaigns/active', 'GET');
  
  if (!campaignsResult.error) {
    console.log('%c✅ Campañas obtenidas', 'color: green');
    console.table(campaignsResult.data.data.map(camp => ({
      ID: camp.id.substring(0, 8),
      Nombre: camp.name,
      Tipo: camp.type,
      Estado: camp.status
    })));
  } else {
    console.log('%c❌ Error obteniendo campañas', 'color: red');
  }
}

// =====================================================
// EJECUTAR TODAS LAS PRUEBAS
// =====================================================
async function runAllTests() {
  console.clear();
  console.log('\n%c╔════════════════════════════════════════════════════╗', 'color: cyan; font-weight: bold');
  console.log('%c║                                                    ║', 'color: cyan; font-weight: bold');
  console.log('%c║      NGS&O CRM GESTIÓN - FRONTEND TEST SUITE      ║', 'color: cyan; font-weight: bold');
  console.log('%c║          Desarrollado por AS Software             ║', 'color: cyan; font-weight: bold');
  console.log('%c║                                                    ║', 'color: cyan; font-weight: bold');
  console.log('%c╚════════════════════════════════════════════════════╝', 'color: cyan; font-weight: bold');

  const startTime = Date.now();

  // Autenticación
  const authSuccess = await testAuth();
  if (!authSuccess) {
    console.log('\n%c❌ Tests abortados - Autenticación fallida', 'color: red; font-weight: bold');
    return;
  }

  // Chats
  const chatId = await testChats();

  // Mensajes
  await testMessages(chatId);

  // Reportes
  await testReports();

  // Campañas
  await testCampaigns();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n%c╔════════════════════════════════════════════════════╗', 'color: cyan; font-weight: bold');
  console.log('%c║         PRUEBAS COMPLETADAS EXITOSAMENTE          ║', 'color: green; font-weight: bold');
  console.log('%c╚════════════════════════════════════════════════════╝', 'color: cyan; font-weight: bold');
  console.log(`\n%c⏱️ Duración total: ${duration} segundos`, 'color: gray');
}

// =====================================================
// INSTRUCCIONES DE USO
// =====================================================
console.log('%c\n📋 INSTRUCCIONES DE USO:', 'color: cyan; font-weight: bold');
console.log('%c\n1. Copiar todo este script', 'color: white');
console.log('%c2. Abrir la consola del navegador (F12)', 'color: white');
console.log('%c3. Pegar el script', 'color: white');
console.log('%c4. Ejecutar: runAllTests()', 'color: yellow; font-weight: bold');
console.log('%c\nO ejecutar tests individuales:', 'color: white');
console.log('%c- testAuth()', 'color: yellow');
console.log('%c- testChats()', 'color: yellow');
console.log('%c- testMessages(chatId)', 'color: yellow');
console.log('%c- testReports()', 'color: yellow');
console.log('%c- testCampaigns()', 'color: yellow');

// Exportar funciones para uso individual
window.testSuite = {
  runAll: runAllTests,
  auth: testAuth,
  chats: testChats,
  messages: testMessages,
  reports: testReports,
  campaigns: testCampaigns,
  api: apiRequest
};

console.log('%c\n✅ Test suite cargado. Ejecuta: runAllTests()', 'color: green; font-weight: bold');
