const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    database: 'crm_whatsapp'
  });

  await client.connect();
  
  // Ver TODOS los nodos del flujo
  const result = await client.query(`
    SELECT name, type, config, "nextNodeId" 
    FROM bot_nodes 
    WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
    ORDER BY "createdAt"
  `);
  
  console.log('\n=== TODOS LOS NODOS DEL FLUJO ===\n');
  
  result.rows.forEach(row => {
    console.log(`[${row.type.toUpperCase()}] ${row.name}`);
    console.log('  nextNodeId:', row.nextNodeId);
    if (row.config.variable) console.log('  variable:', row.config.variable);
    if (row.config.variableName) console.log('  variableName:', row.config.variableName);
    if (row.config.conditions) {
      console.log('  conditions:');
      row.config.conditions.forEach(c => {
        console.log(`    - ${c.variable || 'user_response'} ${c.operator} "${c.value}" -> ${c.targetNodeId}`);
      });
    }
    if (row.config.message) console.log('  message:', row.config.message.substring(0, 80) + '...');
    console.log('---');
  });

  await client.end();
}

main().catch(console.error);
