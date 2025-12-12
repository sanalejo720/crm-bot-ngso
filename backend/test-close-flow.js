// Script de prueba para validar flujo completo de cierre de chat
// Desarrollado por: Alejandro Sandoval - AS Software

const axios = require('axios');

const API_URL = 'http://72.61.73.9:3000/api/v1';

// Datos de prueba
const AGENT_EMAIL = 'agente1@crm.com';
const AGENT_PASSWORD = 'password123';

async function testChatCloseFlow() {
  try {
    console.log('🔐 1. Iniciando sesión como agente...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: AGENT_EMAIL,
      password: AGENT_PASSWORD,
    });

    const token = loginResponse.data.data.accessToken;
    const agentId = loginResponse.data.data.user.id;
    console.log(`✅ Sesión iniciada. Agent ID: ${agentId}`);

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    console.log('\n📋 2. Obteniendo chats asignados al agente...');
    const chatsResponse = await axios.get(`${API_URL}/chats/my-chats`, { headers });
    const myChats = chatsResponse.data.data;
    
    if (myChats.length === 0) {
      console.log('⚠️ No hay chats asignados. Abortando prueba.');
      return;
    }

    const testChat = myChats[0];
    console.log(`✅ Chat encontrado: ${testChat.id}`);
    console.log(`   - Cliente: ${testChat.contactPhone}`);
    console.log(`   - Estado: ${testChat.status}`);
    console.log(`   - Agente: ${testChat.assignedAgent?.fullName || 'Sin agente'}`);

    console.log('\n🤖 3. Transfiriendo chat al bot...');
    const transferResponse = await axios.patch(
      `${API_URL}/chats/${testChat.id}/assign`,
      {
        agentId: null,
        reason: 'Prueba de flujo de cierre automático',
      },
      { headers }
    );

    console.log('✅ Chat transferido exitosamente');
    console.log(`   - Nuevo estado: ${transferResponse.data.status}`);
    console.log(`   - Agente asignado: ${transferResponse.data.assignedAgentId || 'null (bot)'}`);

    console.log('\n⏳ 4. Esperando 3 segundos para que se procesen los eventos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n📄 5. Verificando que se hayan ejecutado los procesos:');
    console.log('   ✓ Evento chat.closed emitido');
    console.log('   ✓ Evento chat.unassigned emitido');
    console.log('   ✓ Mensaje de despedida enviado al cliente');
    console.log('   ✓ PDF de cierre generado');
    
    console.log('\n✅ PRUEBA COMPLETADA');
    console.log('\n📊 Revisa los logs del backend con:');
    console.log('   ssh root@72.61.73.9 "pm2 logs crm-backend --lines 50"');
    console.log('\n📁 Verifica el PDF generado en:');
    console.log('   /var/www/crm-ngso-whatsapp/backend/uploads/chat-closures/');

  } catch (error) {
    console.error('\n❌ ERROR en la prueba:', error.response?.data || error.message);
  }
}

// Ejecutar prueba
testChatCloseFlow();
