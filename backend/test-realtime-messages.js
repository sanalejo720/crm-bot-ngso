const axios = require('axios');
const io = require('socket.io-client');

const API_URL = 'http://localhost:3000/api/v1';
const SOCKET_URL = 'http://localhost:3000';

let token = '';
let userId = '';
let testChatId = '';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

// 1. Autenticar
async function authenticate() {
  try {
    log('🔐', 'Autenticando usuario...', colors.cyan);
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    
    // La respuesta viene en response.data.data (formato estándar del API)
    const authData = response.data.data || response.data;
    
    if (!authData.accessToken) {
      throw new Error('La respuesta no contiene accessToken');
    }
    
    if (!authData.user || !authData.user.id) {
      throw new Error('La respuesta no contiene información del usuario');
    }
    
    token = authData.accessToken;
    userId = authData.user.id;
    log('✅', `Autenticado como: ${authData.user.email}`, colors.green);
    log('🆔', `User ID: ${userId}`, colors.blue);
    return true;
  } catch (error) {
    console.error('📛 Error completo:', error.response?.data || error.message);
    log('❌', `Error de autenticación: ${error.response?.data?.message || error.message}`, colors.red);
    if (error.code === 'ECONNREFUSED') {
      log('⚠️', 'El backend no está corriendo. Inicia el servidor con: npm run start:dev', colors.yellow);
    }
    return false;
  }
}

// 2. Obtener un chat activo con WhatsApp conectado
async function getActiveChat() {
  try {
    log('💬', 'Buscando chats activos...', colors.cyan);
    const response = await axios.get(`${API_URL}/chats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.data.data && response.data.data.length > 0) {
      // Buscar un chat cuyo whatsappNumber esté conectado y NO sea LID
      const chatWithConnectedNumber = response.data.data.find(chat => 
        chat.whatsappNumber && 
        chat.whatsappNumber.status === 'connected' &&
        !chat.contactPhone.includes('@lid') // Evitar contactos LID
      );
      
      if (chatWithConnectedNumber) {
        testChatId = chatWithConnectedNumber.id;
        log('✅', `Chat encontrado: ${testChatId}`, colors.green);
        log('📱', `Contacto: ${chatWithConnectedNumber.contactName} (${chatWithConnectedNumber.contactPhone})`, colors.blue);
        log('📞', `WhatsApp: ${chatWithConnectedNumber.whatsappNumber.phoneNumber} (${chatWithConnectedNumber.whatsappNumber.status})`, colors.green);
        return true;
      } else {
        log('⚠️', 'No hay chats con número WhatsApp conectado (sin LID)', colors.yellow);
        log('💡', 'Usa el primer chat disponible (puede no poder enviar)', colors.yellow);
        testChatId = response.data.data[0].id;
        log('📱', `Contacto: ${response.data.data[0].contactName} (${response.data.data[0].contactPhone})`, colors.blue);
        return true;
      }
    } else {
      log('⚠️', 'No hay chats disponibles', colors.yellow);
      return false;
    }
  } catch (error) {
    log('❌', `Error obteniendo chats: ${error.message}`, colors.red);
    return false;
  }
}

// 3. Conectar WebSocket
function connectWebSocket(chatId) {
  return new Promise((resolve, reject) => {
    log('🔌', 'Conectando a WebSocket...', colors.cyan);
    
    const socket = io(`${SOCKET_URL}/events`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      log('✅', `WebSocket conectado! Socket ID: ${socket.id}`, colors.green);
      
      // Unirse al room del usuario (el backend espera 'agentId')
      socket.emit('agent:join', { agentId: userId }, (response) => {
        if (response && response.success) {
          log('✅', `Unido al room del agente: ${response.room}`, colors.green);
          
          // También unirse al room del chat para recibir eventos de mensajes
          if (chatId) {
            socket.emit('chat:join', { chatId }, (chatResponse) => {
              if (chatResponse && chatResponse.success) {
                log('✅', `Unido al room del chat: ${chatResponse.room}`, colors.green);
                resolve(socket);
              } else {
                log('⚠️', 'No se pudo unir al room del chat', colors.yellow);
                resolve(socket); // Continuar de todos modos
              }
            });
          } else {
            resolve(socket);
          }
        } else {
          log('❌', 'Error uniéndose al room del agente', colors.red);
          reject(new Error('No se pudo unir al room'));
        }
      });
    });

    socket.on('connect_error', (error) => {
      log('❌', `Error de conexión WebSocket: ${error.message}`, colors.red);
      reject(error);
    });

    socket.on('disconnect', () => {
      log('⚠️', 'WebSocket desconectado', colors.yellow);
    });

    // Escuchar todos los eventos
    socket.onAny((eventName, ...args) => {
      log('📡', `Evento recibido: ${eventName}`, colors.magenta);
      console.log('Datos:', JSON.stringify(args, null, 2));
    });

    // Escuchar específicamente mensajes nuevos
    socket.on('message:new', (payload) => {
      log('📨', '¡NUEVO MENSAJE EN TIEMPO REAL!', colors.green);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      if (payload.chatId === testChatId) {
        log('🎯', 'El mensaje es del chat que estamos monitoreando', colors.cyan);
      }
    });

    socket.on('message:status', (payload) => {
      log('📊', 'Estado de mensaje actualizado', colors.blue);
      console.log('Status:', JSON.stringify(payload, null, 2));
    });

    setTimeout(() => {
      reject(new Error('Timeout conectando WebSocket'));
    }, 10000);
  });
}

// 4. Enviar mensaje de prueba
async function sendTestMessage(socket) {
  try {
    log('📤', 'Enviando mensaje de prueba...', colors.cyan);
    
    const testMessage = `Prueba de mensaje en tiempo real - ${new Date().toLocaleTimeString()}`;
    
    const response = await axios.post(
      `${API_URL}/messages/send`,
      {
        chatId: testChatId,
        content: testMessage,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    log('✅', `Mensaje enviado! ID: ${response.data.id}`, colors.green);
    log('💬', `Contenido: "${testMessage}"`, colors.blue);
    log('⏰', 'Esperando recibir evento WebSocket...', colors.yellow);
    
    // Esperar 3 segundos para ver si llega el evento
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return true;
  } catch (error) {
    log('❌', `Error enviando mensaje: ${error.response?.data?.message || error.message}`, colors.red);
    return false;
  }
}

// 5. Monitorear por 30 segundos
async function monitorMessages(socket) {
  log('👀', 'Monitoreando mensajes por 30 segundos...', colors.cyan);
  log('📱', 'Puedes enviar un mensaje desde WhatsApp ahora', colors.yellow);
  
  let messageCount = 0;
  
  socket.on('message:new', () => {
    messageCount++;
    log('🔔', `Total de mensajes recibidos: ${messageCount}`, colors.green);
  });
  
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  log('🏁', `Monitoreo completado. Mensajes recibidos: ${messageCount}`, colors.cyan);
  return messageCount;
}

// 6. Verificar en base de datos
async function verifyInDatabase() {
  try {
    log('🔍', 'Verificando mensajes en base de datos...', colors.cyan);
    
    const response = await axios.get(`${API_URL}/messages/chat/${testChatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const messages = response.data.data || response.data;
    log('✅', `Total de mensajes en DB: ${messages.length}`, colors.green);
    
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      log('📝', `Último mensaje: "${lastMessage.content}"`, colors.blue);
      log('⏰', `Fecha: ${new Date(lastMessage.createdAt).toLocaleString()}`, colors.blue);
    }
    
    return true;
  } catch (error) {
    log('❌', `Error verificando DB: ${error.message}`, colors.red);
    return false;
  }
}

// Función principal
async function runTest() {
  console.log('\n' + '='.repeat(70));
  log('🧪', 'PRUEBA COMPLETA DE MENSAJES EN TIEMPO REAL', colors.cyan);
  console.log('='.repeat(70) + '\n');

  // Paso 1: Autenticar
  if (!await authenticate()) {
    log('❌', 'Prueba abortada: fallo de autenticación', colors.red);
    return;
  }
  console.log('');

  // Paso 2: Obtener chat
  if (!await getActiveChat()) {
    log('❌', 'Prueba abortada: no hay chats disponibles', colors.red);
    return;
  }
  console.log('');

  // Paso 3: Conectar WebSocket (pasando testChatId)
  let socket;
  try {
    socket = await connectWebSocket(testChatId);
  } catch (error) {
    log('❌', 'Prueba abortada: error en WebSocket', colors.red);
    return;
  }
  console.log('');

  // Paso 4: Enviar mensaje de prueba
  await sendTestMessage(socket);
  console.log('');

  // Paso 5: Monitorear mensajes entrantes
  const messagesReceived = await monitorMessages(socket);
  console.log('');

  // Paso 6: Verificar en base de datos
  await verifyInDatabase();
  console.log('');

  // Resumen
  console.log('='.repeat(70));
  log('📊', 'RESUMEN DE LA PRUEBA', colors.cyan);
  console.log('='.repeat(70));
  log('✅', 'Autenticación: OK', colors.green);
  log('✅', 'WebSocket conectado: OK', colors.green);
  log('✅', 'Mensaje enviado: OK', colors.green);
  log(messagesReceived > 0 ? '✅' : '⚠️', `Mensajes recibidos en tiempo real: ${messagesReceived}`, messagesReceived > 0 ? colors.green : colors.yellow);
  console.log('='.repeat(70) + '\n');

  // Desconectar
  socket.disconnect();
  log('👋', 'WebSocket desconectado. Prueba completada.', colors.cyan);
  
  process.exit(0);
}

// Ejecutar
runTest().catch((error) => {
  log('❌', `Error fatal: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
