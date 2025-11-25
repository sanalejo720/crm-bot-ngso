const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';

async function setupAndTestBot() {
  try {
    console.log(' Autenticando...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    const token = loginResponse.data.data.accessToken;
    console.log(' Autenticado\n');

    // Obtener el flujo que creamos
    console.log(' Obteniendo flujos de bot...');
    const flowsResponse = await axios.get(`${API_URL}/bot-flows`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const flows = flowsResponse.data.data.data;
    const flow = flows[flows.length - 1]; // El último creado
    console.log(` Flujo encontrado: ${flow.name}`);
    console.log(`   ID: ${flow.id}`);
    console.log(`   Estado: ${flow.status}\n`);

    // Obtener campaña
    console.log(' Obteniendo campañas...');
    const campaignsResponse = await axios.get(`${API_URL}/campaigns`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const campaigns = campaignsResponse.data.data.data;
    const campaign = campaigns[0];
    console.log(` Campaña: ${campaign.name}`);
    console.log(`   ID: ${campaign.id}\n`);

    // Actualizar campaña con botFlowId
    console.log('  Configurando bot en campaña...');
    await axios.put(
      `${API_URL}/campaigns/${campaign.id}`,
      {
        settings: {
          ...campaign.settings,
          botEnabled: true,
          botFlowId: flow.id,
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log(' Bot configurado en campaña\n');

    // Simular mensaje entrante para activar bot
    console.log(' Bot configurado!');
    console.log(`\n Para probar el bot:`);
    console.log(`   1. Envía un mensaje desde 573147512827 al 573334309474`);
    console.log(`   2. El bot debería responder automáticamente`);
    console.log(`\n Sistema listo!`);

  } catch (error) {
    console.error('\n Error:', error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

setupAndTestBot();
