const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';

async function setupBot() {
  try {
    console.log(' Autenticando...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    const token = loginResponse.data.data.accessToken;
    console.log(' Autenticado\n');

    // Obtener el último flujo creado
    console.log(' Obteniendo flujos...');
    const flowsResponse = await axios.get(`${API_URL}/bot-flows?status=active`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const flows = flowsResponse.data.data?.data || flowsResponse.data.data || [];
    
    if (flows.length === 0) {
      console.log(' No hay flujos activos');
      return;
    }

    const flow = flows[flows.length - 1];
    console.log(` Flujo: ${flow.name}`);
    console.log(`   ID: ${flow.id}\n`);

    console.log(' Configuración completada!');
    console.log(`\n ID del Flujo Bot: ${flow.id}`);
    console.log(`\n Para configurar en una campaña:`);
    console.log(`   UPDATE campaigns SET settings = jsonb_set(settings, '{botFlowId}', '"${flow.id}"');`);
    console.log(`\n Para probar el bot:`);
    console.log(`   1. Envía "Hola" desde 573147512827 al 573334309474`);
    console.log(`   2. El bot responderá con el flujo configurado`);

  } catch (error) {
    console.error('\n Error:', error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

setupBot();
