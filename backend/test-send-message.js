/**
 * Script de Prueba - Envío de Mensaje WhatsApp
 * Envía mensaje desde 3334309474 a 3147512827
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

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

async function authenticate() {
  log('\n🔐 Autenticando...', colors.cyan);
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });

    authToken = response.data.data.accessToken;
    log('✓ Autenticado correctamente', colors.green);
    return true;
  } catch (error) {
    log(`✗ Error en autenticación: ${error.message}`, colors.red);
    return false;
  }
}

function getHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  };
}

async function findWhatsAppNumber() {
  log('\n📱 Buscando número WhatsApp...', colors.cyan);
  try {
    const response = await axios.get(`${API_BASE_URL}/whatsapp-numbers`, getHeaders());
    const numbers = response.data?.data || response.data || [];
    
    const targetNumber = numbers.find(n => n.phoneNumber.includes('3334309474'));
    
    if (targetNumber) {
      log(`✓ Número encontrado: ${targetNumber.displayName}`, colors.green);
      log(`  ID: ${targetNumber.id}`, colors.blue);
      log(`  Estado: ${targetNumber.status}`, colors.blue);
      log(`  SessionName: ${targetNumber.sessionName || 'NO DEFINIDO'}`, colors.yellow);
      return targetNumber;
    } else {
      log('✗ Número no encontrado', colors.red);
      return null;
    }
  } catch (error) {
    log(`✗ Error buscando número: ${error.message}`, colors.red);
    return null;
  }
}

async function sendMessage(whatsappNumberId, to, content) {
  log('\n📤 Enviando mensaje...', colors.cyan);
  log(`  Desde: WhatsApp ID ${whatsappNumberId}`, colors.blue);
  log(`  Para: ${to}`, colors.blue);
  log(`  Contenido: "${content}"`, colors.blue);
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/whatsapp/send-message`,
      {
        whatsappNumberId,
        to,
        content,
        type: 'text',
      },
      getHeaders()
    );

    log('\n✓ ¡Mensaje enviado exitosamente!', colors.green);
    log(`  Resultado: ${JSON.stringify(response.data, null, 2)}`, colors.blue);
    return true;
  } catch (error) {
    log(`\n✗ Error enviando mensaje: ${error.response?.data?.message || error.message}`, colors.red);
    if (error.response?.data) {
      log(`  Detalles: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
    }
    return false;
  }
}

async function main() {
  console.clear();
  log('╔═══════════════════════════════════════════════════════════╗', colors.cyan);
  log('║       PRUEBA DE ENVÍO DE MENSAJE WHATSAPP - CRM         ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════════════╝', colors.cyan);

  // 1. Autenticar
  const authenticated = await authenticate();
  if (!authenticated) {
    process.exit(1);
  }

  // 2. Buscar número WhatsApp
  const whatsappNumber = await findWhatsAppNumber();
  if (!whatsappNumber) {
    log('\n❌ No se pudo continuar sin número WhatsApp', colors.red);
    process.exit(1);
  }

  // 3. Enviar mensaje
  const messageContent = '🤖 Mensaje de prueba desde NGS&O CRM\n\n✓ Sistema funcionando correctamente\n✓ WhatsApp integrado\n✓ Flujo completo operativo\n\nFecha: ' + new Date().toLocaleString('es-CO');
  
  const sent = await sendMessage(
    whatsappNumber.id,
    '573147512827',
    messageContent
  );

  if (sent) {
    log('\n╔═══════════════════════════════════════════════════════════╗', colors.green);
    log('║                  ✓ PRUEBA EXITOSA                        ║', colors.green);
    log('╚═══════════════════════════════════════════════════════════╝', colors.green);
    log('\n📱 Revisa el WhatsApp del destinatario (3147512827)', colors.cyan);
    log('   Deberías recibir el mensaje de prueba', colors.cyan);
  } else {
    log('\n╔═══════════════════════════════════════════════════════════╗', colors.red);
    log('║                  ✗ PRUEBA FALLIDA                        ║', colors.red);
    log('╚═══════════════════════════════════════════════════════════╝', colors.red);
  }

  process.exit(sent ? 0 : 1);
}

main().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
