const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';

async function updateCampaign() {
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
    
    if (campaigns.length === 0) {
      console.log(' No hay campañas');
      return;
    }

    const campaign = campaigns[0];
    console.log(` Campaña: ${campaign.name} (${campaign.id})`);

    const flowId = 'fd99cbfd-4b1d-4ded-a0f1-5af510024d9d';
    
    await axios.put(
      `${API_URL}/campaigns/${campaign.id}`,
      {
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        settings: {
          ...campaign.settings,
          botEnabled: true,
          botFlowId: flowId,
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log(` Bot configurado en campaña`);
    console.log(`   Bot Flow ID: ${flowId}`);
    console.log(`\n Listo para probar! Envía un mensaje desde otro número.`);

  } catch (error) {
    console.error(' Error:', error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

updateCampaign();
