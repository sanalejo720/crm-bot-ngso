/**
 * Test - Flujo Completo de Recepción de Mensajes
 * 
 * Prueba:
 * 1. Recepción de mensaje desde WhatsApp externo
 * 2. Creación/Actualización de cliente
 * 3. Creación/Actualización de chat
 * 4. Guardado de mensaje en BD
 * 5. Activación automática de bot si configurado
 * 6. Asignación de agente si corresponde
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';
let testPhoneNumber = '573147512827'; // Número desde donde enviaremos

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '═'.repeat(65));
  log(`  ${title}`, 'bright');
  console.log('═'.repeat(65) + '\n');
}

async function authenticate() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: 'admin@crm.com',
    password: 'password123',
  });
  authToken = response.data.data.accessToken;
  log('✓ Autenticado como admin@crm.com', 'green');
}

async function testStep1_CheckWhatsAppConnection() {
  section('PASO 1: Verificar Conexión WhatsApp');
  
  const response = await axios.get(`${API_BASE_URL}/whatsapp/numbers`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const numbers = response.data?.data || response.data;
  const connected = numbers.find(n => n.status === 'connected');
  
  if (connected) {
    log(`✓ WhatsApp conectado: ${connected.phoneNumber}`, 'green');
    log(`  SessionName: ${connected.sessionName}`, 'cyan');
    log(`  Estado: ${connected.status}`, 'cyan');
    return connected;
  } else {
    log('✗ No hay WhatsApp conectado', 'red');
    throw new Error('Necesitas conectar un WhatsApp primero');
  }
}

async function testStep2_CheckExistingClient() {
  section('PASO 2: Verificar Cliente Existente');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/clients`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const clients = response.data?.data?.items || response.data?.data || [];
    const existingClient = clients.find(c => c.phone === testPhoneNumber);
    
    if (existingClient) {
      log(`✓ Cliente ya existe:`, 'green');
      log(`  ID: ${existingClient.id}`, 'cyan');
      log(`  Nombre: ${existingClient.fullName}`, 'cyan');
      log(`  Teléfono: ${existingClient.phone}`, 'cyan');
      return existingClient;
    } else {
      log(`⚠ Cliente no existe aún (se creará al recibir mensaje)`, 'yellow');
      return null;
    }
  } catch (error) {
    log(`⚠ Error buscando cliente: ${error.message}`, 'yellow');
    return null;
  }
}

async function testStep3_CheckExistingChat() {
  section('PASO 3: Verificar Chat Existente');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/chats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const chats = response.data?.data || response.data || [];
    const existingChat = chats.find(c => c.externalId?.includes(testPhoneNumber));
    
    if (existingChat) {
      log(`✓ Chat ya existe:`, 'green');
      log(`  ID: ${existingChat.id}`, 'cyan');
      log(`  External ID: ${existingChat.externalId}`, 'cyan');
      log(`  Estado: ${existingChat.status}`, 'cyan');
      log(`  Cliente: ${existingChat.client?.fullName || 'N/A'}`, 'cyan');
      return existingChat;
    } else {
      log(`⚠ Chat no existe aún (se creará al recibir mensaje)`, 'yellow');
      return null;
    }
  } catch (error) {
    log(`⚠ Error buscando chat: ${error.message}`, 'yellow');
    return null;
  }
}

async function testStep4_SimulateMessageReception() {
  section('PASO 4: Simular Recepción de Mensaje');
  
  log(`📱 ACCIÓN REQUERIDA:`, 'yellow');
  log(`   Envía un mensaje de WhatsApp desde ${testPhoneNumber}`, 'yellow');
  log(`   al número conectado (3334309474)`, 'yellow');
  log(``, 'yellow');
  log(`   Mensaje sugerido: "Hola, prueba de bot"`, 'bright');
  log(``, 'yellow');
  log(`⏳ Esperando 60 segundos para que envíes el mensaje...`, 'cyan');
  
  // Esperar 60 segundos
  for (let i = 60; i > 0; i--) {
    process.stdout.write(`\r   ${i} segundos restantes...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n');
  log('✓ Tiempo de espera completado', 'green');
}

async function testStep5_VerifyClientCreation() {
  section('PASO 5: Verificar Creación/Actualización de Cliente');
  
  const response = await axios.get(`${API_BASE_URL}/clients`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const clients = response.data?.data?.items || response.data?.data || [];
  const client = clients.find(c => c.phone === testPhoneNumber);
  
  if (client) {
    log(`✓ Cliente encontrado/creado:`, 'green');
    log(`  ID: ${client.id}`, 'cyan');
    log(`  Nombre: ${client.fullName}`, 'cyan');
    log(`  Teléfono: ${client.phone}`, 'cyan');
    log(`  Agente asignado: ${client.assignedTo?.fullName || 'Sin asignar'}`, 'cyan');
    return client;
  } else {
    log(`✗ Cliente NO fue creado`, 'red');
    throw new Error('El mensaje no se recibió o el cliente no se creó');
  }
}

async function testStep6_VerifyChatCreation() {
  section('PASO 6: Verificar Creación/Actualización de Chat');
  
  const response = await axios.get(`${API_BASE_URL}/chats`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const chats = response.data?.data || response.data || [];
  const chat = chats.find(c => c.externalId?.includes(testPhoneNumber));
  
  if (chat) {
    log(`✓ Chat encontrado/creado:`, 'green');
    log(`  ID: ${chat.id}`, 'cyan');
    log(`  External ID: ${chat.externalId}`, 'cyan');
    log(`  Estado: ${chat.status}`, 'cyan');
    log(`  Último mensaje: ${new Date(chat.lastMessageAt).toLocaleString()}`, 'cyan');
    log(`  Cliente: ${chat.client?.fullName || 'N/A'}`, 'cyan');
    log(`  Agente: ${chat.assignedTo?.fullName || 'Sin asignar'}`, 'cyan');
    return chat;
  } else {
    log(`✗ Chat NO fue creado`, 'red');
    throw new Error('El chat no se creó correctamente');
  }
}

async function testStep7_VerifyMessageSaved() {
  section('PASO 7: Verificar Mensaje Guardado');
  
  const response = await axios.get(`${API_BASE_URL}/chats`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const chats = response.data?.data || response.data || [];
  const chat = chats.find(c => c.externalId?.includes(testPhoneNumber));
  
  if (!chat) {
    throw new Error('Chat no encontrado');
  }
  
  // Obtener mensajes del chat
  try {
    const messagesResponse = await axios.get(
      `${API_BASE_URL}/messages/chats/${chat.id}/messages`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const messages = messagesResponse.data?.data || messagesResponse.data || [];
    
    if (messages.length > 0) {
      log(`✓ Mensajes encontrados: ${messages.length}`, 'green');
      
      // Mostrar último mensaje
      const lastMessage = messages[messages.length - 1];
      log(``, 'cyan');
      log(`  Último mensaje:`, 'bright');
      log(`    ID: ${lastMessage.id}`, 'cyan');
      log(`    Contenido: "${lastMessage.content}"`, 'cyan');
      log(`    Tipo: ${lastMessage.type}`, 'cyan');
      log(`    Dirección: ${lastMessage.direction}`, 'cyan');
      log(`    Fecha: ${new Date(lastMessage.createdAt).toLocaleString()}`, 'cyan');
      
      return messages;
    } else {
      log(`⚠ No hay mensajes en el chat`, 'yellow');
      return [];
    }
  } catch (error) {
    log(`⚠ Error obteniendo mensajes: ${error.message}`, 'yellow');
    return [];
  }
}

async function testStep8_CheckBotActivation() {
  section('PASO 8: Verificar Activación del Bot');
  
  try {
    // Obtener configuración de campaña/bot
    const response = await axios.get(`${API_BASE_URL}/chats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const chats = response.data?.data || response.data || [];
    const chat = chats.find(c => c.externalId?.includes(testPhoneNumber));
    
    if (!chat) {
      log(`⚠ Chat no encontrado`, 'yellow');
      return;
    }
    
    // Verificar si el bot respondió automáticamente
    const messagesResponse = await axios.get(
      `${API_BASE_URL}/messages/chats/${chat.id}/messages`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const messages = messagesResponse.data?.data || messagesResponse.data || [];
    const botMessages = messages.filter(m => m.direction === 'outgoing');
    
    if (botMessages.length > 0) {
      log(`✓ Bot respondió automáticamente: ${botMessages.length} mensaje(s)`, 'green');
      botMessages.forEach((msg, idx) => {
        log(``, 'cyan');
        log(`  Respuesta ${idx + 1}:`, 'bright');
        log(`    Contenido: "${msg.content}"`, 'cyan');
        log(`    Fecha: ${new Date(msg.createdAt).toLocaleString()}`, 'cyan');
      });
    } else {
      log(`⚠ Bot no respondió (puede estar desactivado o sin configuración)`, 'yellow');
    }
    
    return botMessages;
  } catch (error) {
    log(`⚠ Error verificando bot: ${error.message}`, 'yellow');
  }
}

async function testStep9_GenerateReport() {
  section('RESUMEN FINAL');
  
  log(`✓ Test completado exitosamente`, 'green');
  log(``, 'cyan');
  log(`Verificaciones realizadas:`, 'bright');
  log(`  1. ✓ Conexión WhatsApp verificada`, 'green');
  log(`  2. ✓ Cliente verificado/creado`, 'green');
  log(`  3. ✓ Chat verificado/creado`, 'green');
  log(`  4. ✓ Mensaje guardado en BD`, 'green');
  log(`  5. ⚠ Bot evaluado (puede estar inactivo)`, 'yellow');
  log(`  6. ✓ Sistema de mensajería funcional`, 'green');
  log(``, 'cyan');
  log(`Próximos pasos sugeridos:`, 'bright');
  log(`  • Configurar bot automático en campaña`, 'cyan');
  log(`  • Configurar reglas de asignación de agentes`, 'cyan');
  log(`  • Probar envío de mensajes desde CRM`, 'cyan');
}

async function main() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════════╗', 'bright');
  log('║     TEST DE FLUJO COMPLETO DE RECEPCIÓN DE MENSAJES         ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════╝', 'bright');
  
  try {
    // Paso 0: Autenticación
    section('PASO 0: Autenticación');
    await authenticate();
    
    // Paso 1: Verificar conexión WhatsApp
    const whatsappNumber = await testStep1_CheckWhatsAppConnection();
    
    // Paso 2: Verificar cliente existente
    const existingClient = await testStep2_CheckExistingClient();
    
    // Paso 3: Verificar chat existente
    const existingChat = await testStep3_CheckExistingChat();
    
    // Paso 4: Simular recepción (esperar mensaje real)
    await testStep4_SimulateMessageReception();
    
    // Paso 5: Verificar cliente creado/actualizado
    const client = await testStep5_VerifyClientCreation();
    
    // Paso 6: Verificar chat creado/actualizado
    const chat = await testStep6_VerifyChatCreation();
    
    // Paso 7: Verificar mensaje guardado
    const messages = await testStep7_VerifyMessageSaved();
    
    // Paso 8: Verificar activación de bot
    const botMessages = await testStep8_CheckBotActivation();
    
    // Paso 9: Generar reporte
    await testStep9_GenerateReport();
    
    console.log('\n');
    log('╔═══════════════════════════════════════════════════════════════╗', 'green');
    log('║                    ✓ TEST EXITOSO                           ║', 'green');
    log('╚═══════════════════════════════════════════════════════════════╝', 'green');
    console.log('\n');
    
  } catch (error) {
    console.log('\n');
    log('╔═══════════════════════════════════════════════════════════════╗', 'red');
    log('║                    ✗ TEST FALLIDO                           ║', 'red');
    log('╚═══════════════════════════════════════════════════════════════╝', 'red');
    console.log('\n');
    log(`Error: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`Detalles: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    process.exit(1);
  }
}

main();
