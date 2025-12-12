const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!',
  database: 'crm_whatsapp'
});

(async () => {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');
    
    // Actualizar estado del agente
    const updateResult = await client.query(
      `UPDATE users SET "agentState" = $1 WHERE "isAgent" = true`,
      ['available']
    );
    console.log('✅ Filas actualizadas:', updateResult.rowCount);
    
    // Verificar cambios
    const selectResult = await client.query(
      `SELECT id, "fullName", email, "agentState" FROM users WHERE "isAgent" = true`
    );
    console.log('\n📋 Agentes:');
    selectResult.rows.forEach(row => {
      console.log(`  - ${row.fullName} - Estado: ${row.agentState}`);
    });
    
    await client.end();
    console.log('\n✅ Actualización completada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
