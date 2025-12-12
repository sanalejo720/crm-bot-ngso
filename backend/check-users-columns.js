const { Client } = require('pg');

async function checkColumns() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    database: 'crm_whatsapp'
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('Columnas de la tabla users:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
