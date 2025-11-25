const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';

async function testCompleteFlow() {
  try {
    console.log(' 1. Autenticando...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    const token = loginResponse.data.data.accessToken;
    console.log(' Autenticado\n');

    console.log(' 2. Obteniendo chats...');
    const chatsResponse = await axios.get(`${API_URL}/chats?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chats = chatsResponse.data.data?.data || chatsResponse.data.data || [];
    
    if (chats.length === 0) {
      console.log(' No hay chats disponibles');
      return;
    }

    const chat = chats[0];
    console.log(` Chat: ${chat.contactName || chat.contactPhone}`);
    console.log(`   ID: ${chat.id}\n`);

    console.log(' 3. Enviando mensaje...');
    const sendResponse = await axios.post(
      `${API_URL}/messages/send`,
      {
        chatId: chat.id,
        content: ` Mensaje de prueba - ${new Date().toLocaleTimeString()}\n\nEste mensaje se envía desde el panel de agente.\nDebería aparecer inmediatamente en la interfaz.`,
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log(' Mensaje enviado!');
    console.log(' Respuesta:', JSON.stringify(sendResponse.data, null, 2));

    console.log('\n Prueba completada!');
    console.log('   Verifica en la interfaz que el mensaje aparezca sin recargar la página.');

  } catch (error) {
    console.error('\n Error:', error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCompleteFlow();
