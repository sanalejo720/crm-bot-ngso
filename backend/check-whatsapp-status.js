const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123'
});

async function checkStatus() {
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT 
        id, 
        "phoneNumber", 
        status, 
        "sessionName", 
        provider, 
        "lastConnectedAt",
        "isActive"
      FROM whatsapp_numbers 
      ORDER BY "createdAt" DESC
    `);
    
    console.log('\n📱 NÚMEROS WHATSAPP REGISTRADOS:');
    console.log('='.repeat(70));
    
    res.rows.forEach((row, index) => {
      console.log(`\n#${index + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Teléfono: ${row.phoneNumber}`);
      console.log(`  Estado: ${row.status}`);
      console.log(`  Session: ${row.sessionName}`);
      console.log(`  Provider: ${row.provider}`);
      console.log(`  Activo: ${row.isActive}`);
      console.log(`  Última conexión: ${row.lastConnectedAt || 'Nunca'}`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Total: ${res.rows.length} número(s)\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStatus();
