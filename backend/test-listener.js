/**
 * Test Simple - Verificar Listener de Mensajes
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testListener() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST: Verificar Listener de Mensajes WPPConnect');
  console.log('═══════════════════════════════════════════════════\n');

  // Autenticar
  const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: 'admin@crm.com',
    password: 'password123',
  });
  const authToken = authResponse.data.data.accessToken;
  console.log('✓ Autenticado\n');

  // Verificar sesiones activas
  const debugResponse = await axios.get(`${API_BASE_URL}/whatsapp/debug/sessions`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const data = debugResponse.data?.data || debugResponse.data;
  
  console.log('Sesiones en WPPConnect:');
  if (data.wppConnectSessions && data.wppConnectSessions.length > 0) {
    data.wppConnectSessions.forEach((session, idx) => {
      console.log(`  ${idx + 1}. "${session}"`);
    });
    console.log('');
  } else {
    console.log('  ❌ No hay sesiones activas\n');
    console.log('Por favor, reconecta el WhatsApp desde el frontend.\n');
    return;
  }

  // Obtener chats antes de enviar mensaje
  const chatsBefore = await axios.get(`${API_BASE_URL}/chats`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const countBefore = (chatsBefore.data?.data || chatsBefore.data || []).length;
  console.log(`Chats actuales en BD: ${countBefore}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📱 ENVÍA UN MENSAJE DE WHATSAPP AHORA:');
  console.log('   Desde cualquier número');
  console.log('   Al número: 3334309474');
  console.log('   Contenido: "test listener"\n');
  console.log('⏳ Esperando 30 segundos...\n');

  // Esperar 30 segundos
  for (let i = 30; i > 0; i--) {
    process.stdout.write(`\r   ${i} segundos restantes...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Verificar chats después
  const chatsAfter = await axios.get(`${API_BASE_URL}/chats`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const countAfter = (chatsAfter.data?.data || chatsAfter.data || []).length;
  console.log(`Chats después: ${countAfter}\n`);

  if (countAfter > countBefore) {
    console.log('✅ ¡ÉXITO! Se creó un nuevo chat');
    console.log(`   Chats nuevos: ${countAfter - countBefore}\n`);
    
    // Mostrar el nuevo chat
    const allChats = chatsAfter.data?.data || chatsAfter.data || [];
    const newChat = allChats[allChats.length - 1];
    
    console.log('Detalles del chat nuevo:');
    console.log(`  ID: ${newChat.id}`);
    console.log(`  External ID: ${newChat.externalId}`);
    console.log(`  Teléfono: ${newChat.contactPhone}`);
    console.log(`  Nombre: ${newChat.contactName}`);
    console.log(`  Último mensaje: ${newChat.lastMessageText || 'N/A'}`);
    console.log(`  Fecha: ${newChat.lastMessageAt ? new Date(newChat.lastMessageAt).toLocaleString() : 'N/A'}\n`);
  } else {
    console.log('❌ NO se recibió ningún mensaje\n');
    console.log('Posibles causas:');
    console.log('  1. No enviaste el mensaje');
    console.log('  2. El listener no está configurado correctamente');
    console.log('  3. Hay un error en el backend (revisa los logs)\n');
  }

  console.log('═══════════════════════════════════════════════════\n');
}

testListener().catch(error => {
  console.error('Error:', error.message);
  if (error.response?.data) {
    console.error('Detalles:', error.response.data);
  }
});
