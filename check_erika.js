const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!',
  database: 'crm_whatsapp'
});

async function main() {
  await client.connect();
  
  // Buscar Erika
  const users = await client.query('SELECT u.id, u."fullName", u."agentState", r.name as "roleName" FROM users u LEFT JOIN roles r ON u."roleId" = r.id WHERE u."fullName" ILIKE $1', ['%erika%']);
  console.log('=== ERIKA ===');
  console.log(users.rows);
  
  // Ver sus chats asignados
  if (users.rows.length > 0) {
    const erikaId = users.rows[0].id;
    const chats = await client.query('SELECT id, "contactName", status, "lastMessageAt" FROM chats WHERE "assignedAgentId" = $1', [erikaId]);
    console.log('=== CHATS DE ERIKA ===');
    console.log(chats.rows);
    
    // Ver su jornada
    const workday = await client.query('SELECT * FROM agent_workdays WHERE "agentId" = $1 AND "workDate" = CURRENT_DATE', [erikaId]);
    console.log('=== JORNADA HOY ===');
    console.log(workday.rows);
    
    // Ver permisos de su rol
    const rolePerms = await client.query('SELECT r.name, r.permissions FROM roles r JOIN users u ON u."roleId" = r.id WHERE u.id = $1', [erikaId]);
    console.log('=== PERMISOS DEL ROL ===');
    console.log(JSON.stringify(rolePerms.rows, null, 2));
  }
  
  await client.end();
}

main().catch(console.error);
