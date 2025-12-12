// Script para ver flujos desde la BD directamente
const { Client } = require('pg');

async function checkFlows() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'crm_whatsapp',
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!'
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Obtener flujos
    const flowsResult = await client.query(`
      SELECT id, name, description, status, "startNodeId", "createdAt", "updatedAt"
      FROM bot_flows
      ORDER BY "createdAt" DESC
    `);
    
    console.log('\n📋 FLUJOS ENCONTRADOS:', flowsResult.rows.length);
    
    for (const flow of flowsResult.rows) {
      console.log(`\n🔹 Flujo: ${flow.name}`);
      console.log(`   ID: ${flow.id}`);
      console.log(`   Status: ${flow.status}`);
      console.log(`   Start Node: ${flow.startNodeId}`);
      
      // Obtener nodos del flujo
      const nodesResult = await client.query(`
        SELECT id, name, type, "nextNodeId", config, "positionX", "positionY"
        FROM bot_nodes
        WHERE "flowId" = $1
        ORDER BY "positionX", "positionY"
      `, [flow.id]);
      
      console.log(`   Nodos: ${nodesResult.rows.length}`);
      
      if (nodesResult.rows.length > 0) {
        console.log('\n   📝 ESTRUCTURA DEL FLUJO:');
        nodesResult.rows.forEach((node, idx) => {
          console.log(`   ${idx + 1}. ${node.name} (${node.type})`);
          console.log(`      ID: ${node.id}`);
          console.log(`      Next: ${node.nextNodeId || 'ninguno'}`);
          
          if (node.config.variableName) {
            console.log(`      Variable: ${node.config.variableName}`);
          }
          if (node.config.message) {
            console.log(`      Mensaje: ${node.config.message.substring(0, 50)}...`);
          }
        });
      }
    }
    
    // Ver campañas con bot habilitado
    console.log('\n\n🎯 CAMPAÑAS CON BOT:');
    const campaignsResult = await client.query(`
      SELECT id, name, status, settings
      FROM campaigns
      WHERE settings->>'botEnabled' = 'true'
    `);
    
    campaignsResult.rows.forEach(camp => {
      console.log(`\n   📢 ${camp.name}`);
      console.log(`      Bot Flow ID: ${camp.settings.botFlowId}`);
      console.log(`      Status: ${camp.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkFlows();
