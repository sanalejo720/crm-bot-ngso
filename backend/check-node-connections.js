const { Client } = require('pg');

async function checkNodeConnections() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'crm_admin',
    password: 'admin123',
    database: 'crm_whatsapp'
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    const result = await client.query(`
      SELECT 
        id,
        name,
        type,
        config,
        "nextNodeId"
      FROM bot_nodes
      WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
      ORDER BY "positionY", "positionX"
    `);

    console.log('📊 Nodos y sus conexiones:\n');
    result.rows.forEach((node, index) => {
      const config = typeof node.config === 'string' ? JSON.parse(node.config) : node.config;
      console.log(`${index + 1}. ${node.name} (${node.type})`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Next Node ID: ${node.nextNodeId || 'null'}`);
      
      // Check if it has menu options that point to other nodes
      if (config.options && Array.isArray(config.options)) {
        console.log(`   Menu options:`);
        config.options.forEach(opt => {
          console.log(`     - "${opt.label}" → ${opt.nextNodeId || 'null'}`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkNodeConnections();
