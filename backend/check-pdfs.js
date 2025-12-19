const { Client } = require('pg');

const client = new Client({
  user: 'crm_admin',
  host: 'localhost',
  database: 'crm_whatsapp',
  password: 'CRM_NgsoPass2024!',
  port: 5432,
});

async function checkPdfs() {
  await client.connect();
  
  const query = `
    SELECT 
      m.id,
      c."contactPhone",
      c."contactName",
      m.type,
      m."mediaUrl",
      m."mediaFileName",
      m."mediaMimeType",
      m."createdAt"
    FROM messages m
    JOIN chats c ON m."chatId" = c.id
    WHERE m."mediaMimeType" = 'application/pdf'
    ORDER BY m."createdAt" DESC;
  `;
  
  const result = await client.query(query);
  
  console.log(`\n✅ Total de PDFs en el sistema: ${result.rows.length}\n`);
  console.table(result.rows);
  
  await client.end();
}

checkPdfs().catch(err => {
  console.error('Error:', err);
  client.end();
});
