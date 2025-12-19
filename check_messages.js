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
  
  // Ver últimos 10 mensajes
  const msgs = await client.query('SELECT id, content, type, "mediaUrl", "mediaMimeType", direction, "senderType", "createdAt" FROM messages ORDER BY "createdAt" DESC LIMIT 10');
  console.log('=== ULTIMOS 10 MENSAJES ===');
  msgs.rows.forEach(m => {
    console.log(m.createdAt, '|', m.type, '|', m.direction, '|', m.senderType, '|', (m.content || '').substring(0,40), '|', m.mediaUrl || '-');
  });
  
  await client.end();
}

main().catch(console.error);
