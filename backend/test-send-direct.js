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
    
    const numbers = numbersResponse.data.data?.data || numbersResponse.data.data || [];
    console.log(`Encontrados ${numbers.length} números`);
    console.log('Response:', JSON.stringify(numbersResponse.data, null, 2));
    
    if (numbers.length === 0) {
      console.log(' No hay números de WhatsApp configurados');
      return;
    }

    const whatsappNumber = numbers[0];
    console.log(`\n Usando número: ${whatsappNumber.phoneNumber}`);
    console.log(`   Provider: ${whatsappNumber.provider}`);
    console.log(`   Status: ${whatsappNumber.status}\n`);

    // Enviar mensaje directamente a un número de prueba
    const testPhone = '573147512827'; // María López de los deudores de prueba
    
    console.log(` Enviando mensaje a ${testPhone}...`);
    
    const sendResponse = await axios.post(
      `${API_URL}/whatsapp-numbers/${whatsappNumber.id}/send`,
      {
        to: testPhone,
        content: ` Mensaje de prueba del bot\nHora: ${new Date().toLocaleString()}\n\nEste mensaje confirma que el sistema está funcionando correctamente.`,
        type: 'text',
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('\n Mensaje enviado exitosamente!');
    console.log(' Respuesta:', JSON.stringify(sendResponse.data, null, 2));

  } catch (error) {
    console.error('\n Error:', error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSendMessage();
