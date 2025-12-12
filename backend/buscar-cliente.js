const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function buscarCliente() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Buscando cliente con teléfono similar a 573334309474...\n');

    const result = await client.query(`
      SELECT id, "fullName", phone, email, "debtAmount", "daysOverdue", "documentNumber", "collectionStatus", "customFields"
      FROM clients 
      WHERE phone LIKE '%3334309474%'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    console.log(`📋 Clientes encontrados: ${result.rows.length}\n`);

    result.rows.forEach((row, index) => {
      console.log(`Cliente ${index + 1}:`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Nombre: ${row.fullName}`);
      console.log(`   Teléfono: ${row.phone}`);
      console.log(`   Email: ${row.email || 'NULL'}`);
      console.log(`   Deuda: $${row.debtAmount}`);
      console.log(`   Días mora: ${row.daysOverdue}`);
      console.log(`   Documento: ${row.documentNumber}`);
      console.log(`   Estado: ${row.collectionStatus}`);
      console.log(`   CustomFields: ${JSON.stringify(row.customFields)}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

buscarCliente();
