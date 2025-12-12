const { Client } = require('pg');

async function disableNumber() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    database: 'crm_whatsapp'
  });

  try {
    await client.connect();
    console.log('✅ Conectado\n');

    // Desactivar el número problemático
    await client.query(`
      UPDATE whatsapp_numbers
      SET "isActive" = false,
          status = 'disconnected'
      WHERE "phoneNumber" = '3180691289'
    `);

    console.log('✅ Número 3180691289 desactivado');

    // Verificar
    const result = await client.query(`
      SELECT "phoneNumber", "isActive", status, provider
      FROM whatsapp_numbers
    `);

    console.log('\n📱 Números WhatsApp:');
    result.rows.forEach(row => {
      console.log(`  ${row.phoneNumber}: ${row.isActive ? 'ACTIVO' : 'INACTIVO'} (${row.status}) - ${row.provider}`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

disableNumber();
