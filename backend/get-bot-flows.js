// Script para obtener los flujos de bot
const axios = require('axios');

async function getBotFlows() {
  try {
    // Primero hacer login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'admin@assoftware.xyz',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login exitoso');
    
    // Obtener flujos
    const flowsResponse = await axios.get('http://localhost:3000/api/v1/bot-flows', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('\n📋 FLUJOS DE BOT:');
    console.log(JSON.stringify(flowsResponse.data, null, 2));
    
    // Obtener detalles de cada flujo
    if (flowsResponse.data.data && flowsResponse.data.data.data) {
      const flows = flowsResponse.data.data.data;
      
      for (const flow of flows) {
        console.log(`\n\n🔍 DETALLE DEL FLUJO: ${flow.name}`);
        const detailResponse = await axios.get(`http://localhost:3000/api/v1/bot-flows/${flow.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const flowDetail = detailResponse.data.data.data || detailResponse.data.data;
        console.log(`Nodos: ${flowDetail.nodes?.length || 0}`);
        console.log(`Start Node: ${flowDetail.startNodeId}`);
        
        if (flowDetail.nodes) {
          flowDetail.nodes.forEach(node => {
            console.log(`  - ${node.name} (${node.type})`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

getBotFlows();
