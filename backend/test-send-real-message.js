const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';

async function testSendMessage() {
  try {
    // Login
    console.log(' Autenticando...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    const token = loginResponse.data.data.accessToken;
    console.log(' Autenticado\n');

    // Obtener números de WhatsApp
    console.log(' Obteniendo números de WhatsApp...');
    const numbersResponse = await axios.get(`${API_URL}/whatsapp-numbers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const numbers = numbersResponse.data.data.data;
    console.log(`Encontrados ${numbers.length} números\n`);
    
    if (numbers.length === 0) {
      console.log(' No hay números de WhatsApp configurados');
      return;
    }

    const whatsappNumber = numbers[0];
    console.log(` Usando número: ${whatsappNumber.phoneNumber}`);
    console.log(`   Provider: ${whatsappNumber.provider}`);
    console.log(`   Status: ${whatsappNumber.status}\n`);

    // Obtener chats
    console.log(' Obteniendo chats...');
    const chatsResponse = await axios.get(`${API_URL}/chats?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chats = chatsResponse.data.data.data;
    console.log(`Encontrados ${chats.length} chats\n`);

    if (chats.length === 0) {
      console.log(' No hay chats disponibles');
      return;
    }

    const chat = chats[0];
    console.log(` Chat seleccionado: ${chat.contactName || chat.contactPhone}`);
    console.log(`   Teléfono: ${chat.contactPhone}\n`);

    // Enviar mensaje de prueba
    console.log(' Enviando mensaje de prueba...');
    const messageData = {
      chatId: chat.id,
      content: `Hola! Este es un mensaje de prueba desde el sistema. Hora: ${new Date().toLocaleString()}`,
      type: 'text',
    };

    console.log(`   Contenido: ${messageData.content}\n`);

    const sendResponse = await axios.post(`${API_URL}/messages`, messageData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(' Mensaje enviado exitosamente!');
    console.log(' Respuesta:', JSON.stringify(sendResponse.data, null, 2));

  } catch (error) {
    console.error('\n Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSendMessage();
