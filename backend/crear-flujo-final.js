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
    { name: 'Flujo de Cobranza Automatizada', description: 'Flujo completo de cobranza', status: 'draft' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  const flowId = response.data.data.data.id;
  console.log(` Flujo creado: ${flowId}`);
  return flowId;
}

async function createNodes(flowId) {
  const nodes = [
    {
      name: 'Mensaje de Bienvenida',
      type: 'message',
      config: { message: 'Hola, bienvenido al sistema de cobranza.' },
      positionX: 100,
      positionY: 100,
    },
    {
      name: 'Menu de Opciones',
      type: 'menu',
      config: {
        message: 'Selecciona una opcion:',
        options: [
          { id: '1', label: 'Consultar deuda' },
          { id: '2', label: 'Hablar con asesor' },
        ],
      },
      positionX: 100,
      positionY: 250,
    },
  ];
  
  const response = await axios.post(
    `${API_URL}/bot-flows/${flowId}/nodes/bulk`,
    { nodes },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  console.log(` ${response.data.data.data.length} nodos creados`);
  return response.data.data.data;
}

async function setStartNode(flowId, nodeId) {
  await axios.put(
    `${API_URL}/bot-flows/${flowId}`,
    { startNodeId: nodeId },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  console.log(' Nodo inicial configurado');
}

async function publishFlow(flowId) {
  await axios.post(
    `${API_URL}/bot-flows/${flowId}/publish`,
    {},
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  console.log(' Flujo publicado');
}

async function main() {
  try {
    console.log('\n');
    console.log('   CREAR FLUJO DE BOT DE COBRANZA   ');
    console.log('\n');
    
    await login();
    const flowId = await createFlow();
    const nodes = await createNodes(flowId);
    await setStartNode(flowId, nodes[0].id);
    await publishFlow(flowId);
    
    console.log(`\n Flujo completado con ID: ${flowId}`);
  } catch (error) {
    console.error('\n Error:', error.response?.data || error.message);
  }
}

main();
