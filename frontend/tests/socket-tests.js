/**
 * =====================================================
 * SCRIPT DE PRUEBAS - SOCKET.IO (FRONTEND)
 * NGS&O CRM Gestión - Desarrollado por AS Software
 * =====================================================
 * 
 * Este script prueba las conexiones WebSocket y eventos en tiempo real
 * Ejecutar en la consola del navegador (F12) del AgentWorkspace
 */

// =====================================================
// CONFIGURACIÓN
// =====================================================
const SOCKET_URL = 'http://localhost:3000/events';
let testSocket = null;
let testToken = null;
let eventLog = [];

// =====================================================
// UTILIDADES
// =====================================================
function log(message, type = 'info') {
  const colors = {
    info: 'color: cyan',
    success: 'color: green',
    error: 'color: red',
    warning: 'color: yellow',
    event: 'color: magenta'
  };
  
  console.log(`%c${message}`, colors[type]);
  eventLog.push({ time: new Date().toLocaleTimeString(), message, type });
}

// =====================================================
// TEST 1: VERIFICAR SOCKET EXISTENTE
// =====================================================
function testExistingSocket() {
  log('\n========================================', 'info');
  log('🔌 TEST 1: Verificar Socket Existente', 'info');
  log('========================================\n', 'info');

  // Intentar obtener el socket del servicio existente
  if (window.socketService && window.socketService.socket) {
    log('✅ Socket service encontrado', 'success');
    log(`   Estado: ${window.socketService.isConnected ? 'Conectado' : 'Desconectado'}`, 'info');
    
    if (window.socketService.socket.id) {
      log(`   Socket ID: ${window.socketService.socket.id}`, 'info');
    }

    return true;
  } else {
    log('⚠️ No se encontró socket service activo', 'warning');
    log('   Asegúrate de estar en AgentWorkspace', 'warning');
    return false;
  }
}

// =====================================================
// TEST 2: ESCUCHAR EVENTOS
// =====================================================
function testEventListeners() {
  log('\n========================================', 'info');
  log('👂 TEST 2: Registrar Listeners de Eventos', 'info');
  log('========================================\n', 'info');

  if (!window.socketService) {
    log('❌ Socket service no disponible', 'error');
    return;
  }

  const socket = window.socketService.socket;

  // Listener para chat:assigned
  log('📝 Registrando listener: chat:assigned', 'info');
  socket.on('chat:assigned', (data) => {
    log('📩 Evento recibido: chat:assigned', 'event');
    console.table({
      'Chat ID': data.chatId,
      'Contacto': data.contactName,
      'Teléfono': data.contactPhone,
      'Timestamp': new Date(data.timestamp).toLocaleTimeString()
    });
  });

  // Listener para message:new
  log('📝 Registrando listener: message:new', 'info');
  socket.on('message:new', (data) => {
    log('💬 Evento recibido: message:new', 'event');
    console.log('Datos del mensaje:', data);
  });

  // Listener para chat:status
  log('📝 Registrando listener: chat:status', 'info');
  socket.on('chat:status', (data) => {
    log('🔄 Evento recibido: chat:status', 'event');
    console.log('Cambio de estado:', data);
  });

  // Listener genérico para todos los eventos
  log('📝 Registrando listener: ALL EVENTS', 'info');
  socket.onAny((eventName, ...args) => {
    log(`🎯 Evento capturado: ${eventName}`, 'event');
    console.log('Datos:', args);
  });

  log('\n✅ Todos los listeners registrados', 'success');
  log('   Esperando eventos...', 'info');
}

// =====================================================
// TEST 3: EMITIR EVENTOS
// =====================================================
async function testEmitEvents() {
  log('\n========================================', 'info');
  log('📤 TEST 3: Emitir Eventos al Servidor', 'info');
  log('========================================\n', 'info');

  if (!window.socketService) {
    log('❌ Socket service no disponible', 'error');
    return;
  }

  const socket = window.socketService.socket;
  const userId = localStorage.getItem('userId') || 'test-user-id';

  // TEST 3.1: Agent Join Room
  log('TEST 3.1: Unirse a sala de agente', 'info');
  
  return new Promise((resolve) => {
    socket.emit('agent:join', { agentId: userId }, (response) => {
      if (response && response.success) {
        log('✅ Unido a sala exitosamente', 'success');
        log(`   Sala: ${response.room}`, 'info');
      } else {
        log('❌ Error uniéndose a sala', 'error');
        console.log('Response:', response);
      }
      resolve();
    });
  });
}

// =====================================================
// TEST 4: VERIFICAR CONEXIÓN
// =====================================================
function testConnection() {
  log('\n========================================', 'info');
  log('🔍 TEST 4: Verificar Estado de Conexión', 'info');
  log('========================================\n', 'info');

  if (!window.socketService) {
    log('❌ Socket service no disponible', 'error');
    return;
  }

  const socket = window.socketService.socket;

  log(`Estado de conexión: ${socket.connected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}`, 
      socket.connected ? 'success' : 'error');
  
  log(`Socket ID: ${socket.id || 'N/A'}`, 'info');
  log(`Transport: ${socket.io.engine.transport.name || 'N/A'}`, 'info');
  
  // Verificar listeners activos
  const eventNames = Object.keys(socket._callbacks || {});
  log(`\nListeners activos: ${eventNames.length}`, 'info');
  eventNames.forEach(event => {
    log(`   - ${event}`, 'info');
  });

  // Verificar reconexión automática
  log(`\nReconexión automática: ${socket.io.reconnection ? '✅ Habilitada' : '❌ Deshabilitada'}`, 'info');
  log(`Intentos de reconexión: ${socket.io.reconnectionAttempts || 'Ilimitado'}`, 'info');
}

// =====================================================
// TEST 5: SIMULAR DESCONEXIÓN/RECONEXIÓN
// =====================================================
async function testReconnection() {
  log('\n========================================', 'info');
  log('🔄 TEST 5: Simular Desconexión/Reconexión', 'info');
  log('========================================\n', 'info');

  if (!window.socketService) {
    log('❌ Socket service no disponible', 'error');
    return;
  }

  const socket = window.socketService.socket;

  // Desconectar
  log('Desconectando...', 'warning');
  socket.disconnect();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  log(`Estado después de desconectar: ${socket.connected ? 'Conectado' : 'Desconectado'}`, 'info');

  // Reconectar
  log('\nReconectando...', 'info');
  socket.connect();

  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (socket.connected) {
    log('✅ Reconexión exitosa', 'success');
    log(`   Nuevo Socket ID: ${socket.id}`, 'info');
  } else {
    log('❌ Reconexión fallida', 'error');
  }
}

// =====================================================
// TEST 6: MOSTRAR LOG DE EVENTOS
// =====================================================
function showEventLog() {
  log('\n========================================', 'info');
  log('📋 LOG DE EVENTOS', 'info');
  log('========================================\n', 'info');

  if (eventLog.length === 0) {
    log('No hay eventos registrados', 'warning');
    return;
  }

  console.table(eventLog);
  log(`\nTotal de eventos: ${eventLog.length}`, 'info');
}

// =====================================================
// TEST 7: LIMPIAR LISTENERS
// =====================================================
function cleanupListeners() {
  log('\n========================================', 'info');
  log('🧹 TEST 7: Limpiar Listeners', 'info');
  log('========================================\n', 'info');

  if (!window.socketService) {
    log('❌ Socket service no disponible', 'error');
    return;
  }

  const socket = window.socketService.socket;

  socket.off('chat:assigned');
  socket.off('message:new');
  socket.off('chat:status');
  socket.offAny();

  log('✅ Todos los listeners removidos', 'success');
}

// =====================================================
// EJECUTAR TODAS LAS PRUEBAS
// =====================================================
async function runSocketTests() {
  console.clear();
  
  log('╔════════════════════════════════════════════════════╗', 'info');
  log('║                                                    ║', 'info');
  log('║      PRUEBAS DE SOCKET.IO - FRONTEND              ║', 'info');
  log('║          NGS&O CRM Gestión                        ║', 'info');
  log('║                                                    ║', 'info');
  log('╚════════════════════════════════════════════════════╝', 'info');

  // TEST 1
  const socketExists = testExistingSocket();
  if (!socketExists) {
    log('\n❌ No se puede continuar sin socket activo', 'error');
    return;
  }

  // Esperar un momento entre tests
  await new Promise(resolve => setTimeout(resolve, 1000));

  // TEST 2
  testEventListeners();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // TEST 3
  await testEmitEvents();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // TEST 4
  testConnection();
  await new Promise(resolve => setTimeout(resolve, 1000));

  log('\n╔════════════════════════════════════════════════════╗', 'info');
  log('║         PRUEBAS BÁSICAS COMPLETADAS               ║', 'info');
  log('╚════════════════════════════════════════════════════╝', 'info');

  log('\n📝 Comandos adicionales disponibles:', 'info');
  log('   - testReconnection()  : Probar desconexión/reconexión', 'warning');
  log('   - showEventLog()      : Mostrar log de eventos', 'warning');
  log('   - cleanupListeners()  : Limpiar todos los listeners', 'warning');
}

// =====================================================
// EXPORTAR FUNCIONES
// =====================================================
window.socketTests = {
  runAll: runSocketTests,
  testExisting: testExistingSocket,
  testListeners: testEventListeners,
  testEmit: testEmitEvents,
  testConnection: testConnection,
  testReconnection: testReconnection,
  showLog: showEventLog,
  cleanup: cleanupListeners
};

// =====================================================
// INSTRUCCIONES
// =====================================================
console.log('%c\n📋 INSTRUCCIONES DE USO:', 'color: cyan; font-weight: bold');
console.log('%c\n1. Asegúrate de estar en AgentWorkspace', 'color: white');
console.log('%c2. Copiar todo este script', 'color: white');
console.log('%c3. Abrir la consola del navegador (F12)', 'color: white');
console.log('%c4. Pegar el script', 'color: white');
console.log('%c5. Ejecutar: runSocketTests()', 'color: yellow; font-weight: bold');

console.log('%c\nComandos disponibles:', 'color: white');
console.log('%c- runSocketTests()      : Ejecutar todas las pruebas', 'color: yellow');
console.log('%c- testReconnection()    : Probar reconexión', 'color: yellow');
console.log('%c- showEventLog()        : Ver log de eventos', 'color: yellow');
console.log('%c- cleanupListeners()    : Limpiar listeners', 'color: yellow');

console.log('%c\n✅ Socket test suite cargado', 'color: green; font-weight: bold');
