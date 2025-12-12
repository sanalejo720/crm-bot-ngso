const { Client } = require('pg');

async function queryNodes() {
  const client = new Client({
    host: '172.203.16.202',
    port: 5432,
    user: 'crm_admin',
    password: 'admin123',
    database: 'crm_whatsapp'
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos remota\n');

    const result = await client.query(`
      SELECT 
        id,
        name,
        type,
        "nextNodeId",
        "positionY",
        "positionX"
      FROM bot_nodes
      WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
      ORDER BY "positionY", "positionX"
    `);

    console.log('📊 Nodos en el flujo:\n');
    result.rows.forEach((node, index) => {
      console.log(`${index + 1}. [${node.type}] ${node.name}`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Next Node ID: ${node.nextNodeId || 'null'}`);
      console.log(`   Position: (${node.positionX}, ${node.positionY})`);
      console.log('');
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

queryNodes();
