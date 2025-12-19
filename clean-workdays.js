const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    database: 'crm_whatsapp',
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    port: 5432,
  });

  await client.connect();
  
  // Actualizar maxConcurrentChats a 50 para todos los agentes
  const result = await client.query(`
    UPDATE users 
    SET "maxConcurrentChats" = 50 
    WHERE "roleId" IN (SELECT id FROM roles WHERE name = 'Agente')
  `);
  console.log('✅ Agentes actualizados con límite de 50 chats:', result.rowCount);
  
  // Mostrar agentes con su nuevo límite
  const agents = await client.query(`
    SELECT u."fullName", u."maxConcurrentChats" 
    FROM users u
    JOIN roles r ON u."roleId" = r.id
    WHERE r.name = 'Agente'
    ORDER BY u."fullName"
  `);
  console.log('\n=== AGENTES CON NUEVO LÍMITE ===');
  agents.rows.forEach(a => console.log(`${a.fullName}: ${a.maxConcurrentChats} chats máx`));
  
  await client.end();
}

main().catch(console.error);
