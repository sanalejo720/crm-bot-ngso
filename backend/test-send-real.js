/**
 * Prueba Real de Envío de WhatsApp
 * Envía mensaje desde 573334309474 a 573147512827
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  console.log('\n' + '='.repeat(70));
  log('  PRUEBA REAL DE ENVÍO DE WHATSAPP', colors.cyan);
  console.log('='.repeat(70) + '\n');

  let authToken = '';

  // 1. Autenticar
  log('1. Autenticando...', colors.blue);
  try {
    const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    authToken = authResponse.data.data.accessToken;
    log('   ✓ Autenticado correctamente\n', colors.green);
  } catch (error) {
    log('   ✗ Error de autenticación: ' + error.message, colors.red);
    return;
  }

  const headers = {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  };

  // 2. Buscar el número WhatsApp conectado
  log('2. Buscando número WhatsApp conectado (573334309474)...', colors.blue);
  try {
    const numbersResponse = await axios.get(`${API_BASE_URL}/whatsapp-numbers`, headers);
    const numbers = numbersResponse.data?.data || numbersResponse.data || [];
    
    const targetNumber = numbers.find(n => 
      n.phoneNumber.includes('3334309474') || n.phoneNumber.includes('573334309474')
    );

    if (!targetNumber) {
      log('   ✗ No se encontró el número 573334309474', colors.red);
      log('   Números disponibles:', colors.yellow);
      numbers.forEach(n => log(`     - ${n.phoneNumber} (${n.displayName})`, colors.yellow));
      return;
    }

    log(`   ✓ Número encontrado: ${targetNumber.displayName}`, colors.green);
    log(`     ID: ${targetNumber.id}`, colors.blue);
    log(`     Estado: ${targetNumber.status}`, colors.blue);
    log(`     Conectado: ${targetNumber.status === 'connected' ? 'SÍ' : 'NO'}\n`, colors.blue);

    if (targetNumber.status !== 'connected') {
      log('   ⚠️  ADVERTENCIA: El número no está conectado', colors.yellow);
      log('   El envío podría fallar\n', colors.yellow);
    }

    // 3. Enviar mensaje de prueba
    log('3. Enviando mensaje de prueba...', colors.blue);
    log(`   Desde: 573334309474`, colors.cyan);
    log(`   Para: 573147512827`, colors.cyan);
    log(`   Contenido: "🤖 Prueba de sistema CRM - ¡Todo funciona!"\n`, colors.cyan);

    try {
      const sendResponse = await axios.post(
        `${API_BASE_URL}/whatsapp/send-message`,
        {
          whatsappNumberId: targetNumber.id,
          to: '573147512827',
          content: '🤖 Prueba de sistema CRM NGS&O - ¡Todo funciona correctamente! Mensaje enviado desde el sistema automatizado.',
          type: 'text',
        },
        headers
      );

      log('   ✓ MENSAJE ENVIADO EXITOSAMENTE!', colors.green);
      log(`\n   Respuesta del servidor:`, colors.cyan);
      console.log(JSON.stringify(sendResponse.data, null, 2));

      // 4. Verificar que se guardó en la base de datos
      log('\n4. Verificando que el mensaje se guardó...', colors.blue);
      
      // Esperar un momento para que se procese
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Buscar si se creó un chat con ese número
      const chatsResponse = await axios.get(`${API_BASE_URL}/chats`, headers);
      const chats = chatsResponse.data?.data || [];
      
      const chatWithNumber = chats.find(c => 
        c.contactPhone && c.contactPhone.includes('3147512827')
      );

      if (chatWithNumber) {
        log('   ✓ Chat encontrado en la base de datos', colors.green);
        log(`     Chat ID: ${chatWithNumber.id}`, colors.blue);
        log(`     Cliente: ${chatWithNumber.contactPhone}`, colors.blue);
        log(`     Estado: ${chatWithNumber.status}`, colors.blue);

        // Buscar mensajes en ese chat
        const messagesResponse = await axios.get(
          `${API_BASE_URL}/messages?chatId=${chatWithNumber.id}`,
          headers
        );
        const messages = messagesResponse.data?.data || [];
        
        log(`     Mensajes: ${messages.length}`, colors.blue);
        
        if (messages.length > 0) {
          log('\n   ✓ MENSAJE ENCONTRADO EN LA BASE DE DATOS', colors.green);
          const lastMessage = messages[messages.length - 1];
          log(`     Contenido: "${lastMessage.content.substring(0, 50)}..."`, colors.cyan);
          log(`     Dirección: ${lastMessage.direction}`, colors.cyan);
          log(`     Fecha: ${lastMessage.createdAt}`, colors.cyan);
        }
      } else {
        log('   ℹ️  Chat no encontrado todavía (puede tomar unos segundos)', colors.yellow);
      }

      console.log('\n' + '='.repeat(70));
      log('  ✅ PRUEBA COMPLETADA EXITOSAMENTE', colors.green);
      console.log('='.repeat(70));
      log('\n  Verifica en el teléfono 3147512827 que llegó el mensaje', colors.cyan);
      console.log('='.repeat(70) + '\n');

    } catch (sendError) {
      log('   ✗ Error al enviar mensaje:', colors.red);
      log(`     ${sendError.response?.data?.message || sendError.message}`, colors.red);
      
      if (sendError.response?.data) {
        log('\n   Detalles del error:', colors.yellow);
        console.log(JSON.stringify(sendError.response.data, null, 2));
      }
    }

  } catch (error) {
    log('   ✗ Error: ' + error.message, colors.red);
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
