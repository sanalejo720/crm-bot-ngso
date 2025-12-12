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
    
    const chatId = '970f82e0-2795-4146-b93a-bd9fe98e0216';
    
    // Desasignar agente y cliente del chat, cambiar estado a bot
    await client.query(
      `UPDATE chats SET "assignedAgentId" = NULL, "clientId" = NULL, status = $1 WHERE id = $2`,
      ['bot', chatId]
    );
    console.log('✅ Chat desasignado y listo para el bot');
    
    // Verificar cambios
    const result = await client.query(
      `SELECT id, "contactPhone", status, "assignedAgentId", "clientId" FROM chats WHERE id = $1`,
      [chatId]
    );
    console.log('\n📋 Estado del chat:');
    console.log('  - ID:', result.rows[0].id);
    console.log('  - Teléfono:', result.rows[0].contactPhone);
    console.log('  - Estado:', result.rows[0].status);
    console.log('  - Agente asignado:', result.rows[0].assignedAgentId || 'Ninguno');
    console.log('  - Cliente:', result.rows[0].clientId || 'Ninguno');
    
    await client.end();
    console.log('\n✅ Listo para recibir mensaje y activar bot');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
