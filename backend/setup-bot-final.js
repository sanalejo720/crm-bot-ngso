const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';

async function configureBotCampaign() {
  try {
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    const token = loginResponse.data.data.accessToken;

    const campaignsResponse = await axios.get(`${API_URL}/campaigns`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const campaigns = campaignsResponse.data.data?.data || campaignsResponse.data.data || [];
    const campaign = campaigns[0];
    
    console.log(` Actualizando campaña: ${campaign.name}\n`);

    const flowId = 'fd99cbfd-4b1d-4ded-a0f1-5af510024d9d';
    
    const response = await axios.patch(
      `${API_URL}/campaigns/${campaign.id}/settings`,
      {
        settings: {
          botEnabled: true,
          botFlowId: flowId,
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log(` Bot configurado en campaña!`);
    console.log(`   Flow ID: ${flowId}`);
    console.log(`\n Todo listo! El bot se activará automáticamente en mensajes entrantes.`);
    console.log(`\n Para probar:`);
    console.log(`   Envía "Hola" desde 573147512827 al 573334309474`);

  } catch (error) {
    console.error(' Error:', error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

configureBotCampaign();
