const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';

async function testSendMessage() {
  try {
    console.log(' Autenticando...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    const token = loginResponse.data.data.accessToken;
    console.log(' Autenticado\n');

    console.log(' Obteniendo números de WhatsApp...');
    const numbersResponse = await axios.get(`${API_URL}/whatsapp-numbers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const numbers = numbersResponse.data.data;
    const whatsappNumber = numbers.find(n => n.status === 'connected');
    
    if (!whatsappNumber) {
      console.log(' No hay números conectados');
      return;
    }

    console.log(` Número conectado: ${whatsappNumber.phoneNumber}`);
    console.log(`   Provider: ${whatsappNumber.provider}`);
    console.log(`   ID: ${whatsappNumber.id}\n`);

    const testPhone = '573147512827';
    console.log(` Enviando mensaje a ${testPhone}...\n`);
    
    const sendResponse = await axios.post(
      `${API_URL}/whatsapp/send-message`,
      {
        whatsappNumberId: whatsappNumber.id,
        to: testPhone,
        content: ` Prueba del sistema de bot\n\nHola! Este es un mensaje de prueba.\nHora: ${new Date().toLocaleString()}\n\nEl bot está funcionando correctamente.`,
        type: 'text',
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log(' Mensaje enviado!');
    console.log(' Respuesta:', JSON.stringify(sendResponse.data, null, 2));

  } catch (error) {
    console.error('\n Error:', error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testSendMessage();
