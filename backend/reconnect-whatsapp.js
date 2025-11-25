/**
 * Script - Reconectar WhatsApp (Generar QR)
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

async function authenticate() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: 'admin@crm.com',
    password: 'password123',
  });
  authToken = response.data.data.accessToken;
  console.log('✓ Autenticado como admin@crm.com\n');
}

async function reconnectWhatsApp() {
  const whatsappId = 'dd07c8a3-62a8-4e99-85bb-4ffefbbc4d82'; // 3334309474
  
  console.log('═════════════════════════════════════════════════════════');
  console.log('           RECONECTAR WHATSAPP 3334309474');
  console.log('═════════════════════════════════════════════════════════\n');
  
  console.log('Iniciando sesión WPPConnect...\n');
  
  const response = await axios.post(
    `${API_BASE_URL}/whatsapp/${whatsappId}/wppconnect/start`,
    {},
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  const data = response.data?.data || response.data;
  
  console.log('Respuesta del servidor:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n');
  
  if (data.qrCode) {
    console.log('✓ QR generado exitosamente\n');
    console.log('CÓDIGO QR (base64):');
    console.log('─────────────────────────────────────────────────────────');
    console.log(data.qrCode);
    console.log('─────────────────────────────────────────────────────────\n');
    
    console.log('INSTRUCCIONES:');
    console.log('1. Copia el código base64 de arriba');
    console.log('2. Ve a: https://base64.guru/converter/decode/image');
    console.log('3. Pega el código (sin "data:image/png;base64,")');
    console.log('4. Descarga la imagen');
    console.log('5. Escanea con WhatsApp (Dispositivos vinculados)\n');
  } else if (data.message) {
    console.log('Estado:', data.message);
    
    if (data.status === 'CONNECTED') {
      console.log('\n✓✓✓ Ya está CONECTADO! ✓✓✓\n');
    } else {
      console.log('\nIntenta escanear el QR nuevamente.\n');
    }
  }
  
  console.log('═════════════════════════════════════════════════════════\n');
}

async function checkStatus() {
  setTimeout(async () => {
    console.log('\nVerificando estado de la conexión...\n');
    
    const response = await axios.get(`${API_BASE_URL}/whatsapp/numbers`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const numbers = response.data?.data || response.data;
    const connected = numbers.find(n => n.phoneNumber === '573334309474');
    
    if (connected) {
      console.log('Estado actual:');
      console.log(`  Teléfono: ${connected.phoneNumber}`);
      console.log(`  Estado: ${connected.status}`);
      console.log(`  SessionName: ${connected.sessionName || 'NO DEFINIDO'}`);
      
      if (connected.status === 'connected' && connected.sessionName) {
        console.log('\n✓✓✓ WhatsApp CONECTADO correctamente ✓✓✓\n');
        console.log('Ya puedes enviar mensajes. Ejecuta:');
        console.log('  node test-send-message.js\n');
      } else {
        console.log('\n⚠️  Aún no está conectado. Escanea el QR.\n');
      }
    }
  }, 5000);
}

async function main() {
  try {
    await authenticate();
    await reconnectWhatsApp();
    
    console.log('⏳ Esperando 5 segundos para verificar conexión...');
    await checkStatus();
    
    // Mantener el script vivo
    setTimeout(() => {
      console.log('\nScript finalizado.');
      process.exit(0);
    }, 10000);
    
  } catch (error) {
    console.error('\n✗ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
