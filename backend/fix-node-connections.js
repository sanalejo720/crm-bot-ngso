const { Client } = require('pg');

async function fixNodeConnections() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    database: 'crm_whatsapp'
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    const flowId = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

    // Get all nodes in order
    const result = await client.query(`
      SELECT 
        id,
        name,
        type,
        config,
        "nextNodeId"
      FROM bot_nodes
      WHERE "flowId" = $1
      ORDER BY "positionY", "positionX"
    `, [flowId]);

    const nodes = result.rows;
    console.log(`📊 Encontrados ${nodes.length} nodos\n`);

    // Node 1: MESSAGE "Saludo y Tratamiento de Datos" → Node 2: CONDITION "Validar Aceptación"
    const node1 = nodes.find(n => n.name === 'Saludo y Tratamiento de Datos');
    const node2 = nodes.find(n => n.name === 'Validar Aceptación');
    
    if (node1 && node2 && !node1.nextNodeId) {
      await client.query(`
        UPDATE bot_nodes
        SET "nextNodeId" = $1
        WHERE id = $2
      `, [node2.id, node1.id]);
      console.log(`✅ ${node1.name} → ${node2.name}`);
    }

    // Get updated nodes
    const updatedResult = await client.query(`
      SELECT 
        id,
        name,
        type,
        "nextNodeId"
      FROM bot_nodes
      WHERE "flowId" = $1
      ORDER BY "positionY", "positionX"
    `, [flowId]);

    console.log('\n📋 Conexiones actualizadas:');
    updatedResult.rows.forEach((node, index) => {
      const nextNode = updatedResult.rows.find(n => n.id === node.nextNodeId);
      console.log(`${index + 1}. [${node.type}] ${node.name}`);
      if (nextNode) {
        console.log(`   → ${nextNode.name}`);
      } else {
        console.log(`   → (ninguno)`);
      }
    });

    await client.end();
    console.log('\n✅ Completado!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixNodeConnections();
