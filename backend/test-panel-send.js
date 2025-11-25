const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';

async function testMessageSend() {
  try {
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    const token = loginResponse.data.data.accessToken;
    console.log(' Autenticado\n');

    // Buscar chat específico por teléfono
    const chatsResponse = await axios.get(`${API_URL}/chats?search=573147512827`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chats = chatsResponse.data.data?.data || chatsResponse.data.data || [];
    
    let chat = chats.find(c => c.contactPhone.includes('573147512827'));
    
    if (!chat) {
      console.log('Chat no encontrado, obteniendo todos los chats...');
      const allChats = await axios.get(`${API_URL}/chats?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const all = allChats.data.data?.data || allChats.data.data || [];
      console.log(`Chats disponibles: ${all.length}`);
      all.forEach(c => console.log(`  - ${c.contactName || c.contactPhone} - WhatsApp: ${c.whatsappNumberId ? 'Sí' : 'No'}`));
      
      chat = all.find(c => c.whatsappNumberId);
    }

    if (!chat) {
      console.log(' No hay chats con WhatsApp conectado');
      return;
    }

    console.log(` Chat: ${chat.contactName || chat.contactPhone}`);
    console.log(`   WhatsApp ID: ${chat.whatsappNumberId}\n`);

    console.log(' Enviando mensaje...');
    const sendResponse = await axios.post(
      `${API_URL}/messages/send`,
      {
        chatId: chat.id,
        content: ` Prueba de panel - ${new Date().toLocaleTimeString()}\n\n¡El mensaje se envía correctamente desde el CRM!`,
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('\n Mensaje enviado exitosamente!');
    console.log(' ID del mensaje:', sendResponse.data.data.id);
    console.log(' Estado:', sendResponse.data.data.status);

  } catch (error) {
    console.error('\n Error:', error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testMessageSend();
