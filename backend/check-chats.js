const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123'
});

async function checkChats() {
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT 
        c.id, 
        c."contactName",
        c."contactPhone",
        c."lastMessageAt",
        c."whatsappNumberId",
        w."phoneNumber" as whatsapp_phone,
        w.status as whatsapp_status
      FROM chats c
      LEFT JOIN whatsapp_numbers w ON c."whatsappNumberId" = w.id
      ORDER BY c."lastMessageAt" DESC
      LIMIT 5
    `);
    
    console.log('\n💬 CHATS ACTIVOS:');
    console.log('='.repeat(90));
    
    res.rows.forEach((row, index) => {
      console.log(`\n#${index + 1}:`);
      console.log(`  Chat ID: ${row.id}`);
      console.log(`  Contacto: ${row.contactName} (${row.contactPhone})`);
      console.log(`  WhatsApp Number ID: ${row.whatsappNumberId}`);
      console.log(`  WhatsApp Número: ${row.whatsapp_phone}`);
      console.log(`  WhatsApp Estado: ${row.whatsapp_status}`);
      console.log(`  Último mensaje: ${row.lastMessageAt || 'Nunca'}`);
    });
    
    console.log('\n' + '='.repeat(90));
    console.log(`\n✅ Total: ${res.rows.length} chat(s)\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkChats();
