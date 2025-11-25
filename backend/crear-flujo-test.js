const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';
let authToken = '';

async function login() {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@crm.com',
    password: 'password123',
  });
  authToken = response.data.data.accessToken;
  console.log(' Login exitoso');
}

async function createFlow() {
  const response = await axios.post(
    `${API_URL}/bot-flows`,
    { name: 'Flujo de Prueba', description: 'Flujo de prueba', status: 'draft' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  console.log('Response:', JSON.stringify(response.data, null, 2));
  const flowId = response.data.data?.id || response.data.id;
  console.log(` Flujo creado: ${flowId}`);
  return flowId;
}

async function main() {
  try {
    await login();
    const flowId = await createFlow();
    console.log(`\n ID del flujo: ${flowId}`);
  } catch (error) {
    console.error(' Error:', error.response?.data || error.message);
  }
}

main();
