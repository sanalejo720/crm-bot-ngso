const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function limpiarDatosPrueba() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Iniciando limpieza de datos de prueba para 573334309474...\n');

    // 1. Eliminar mensajes asociados
    const deleteMessages = await client.query(`
      DELETE FROM messages 
      WHERE "chatId" IN (
        SELECT id FROM chats WHERE "contactPhone" LIKE '573334309474%'
      )
      RETURNING id
    `);
    console.log(`✅ Mensajes eliminados: ${deleteMessages.rowCount}`);

    // 2. Eliminar chats
    const deleteChats = await client.query(`
      DELETE FROM chats 
      WHERE "contactPhone" LIKE '573334309474%'
      RETURNING id
    `);
    console.log(`✅ Chats eliminados: ${deleteChats.rowCount}`);

    // 3. Eliminar clientes
    const deleteClients = await client.query(`
      DELETE FROM clients 
      WHERE phone = '573334309474'
      RETURNING id
    `);
    console.log(`✅ Clientes eliminados: ${deleteClients.rowCount}`);

    // 4. Verificar deudor
    const debtor = await client.query(`
      SELECT "fullName", phone, "debtAmount", "daysOverdue", status
      FROM debtors 
      WHERE phone = '573334309474'
    `);
    
    console.log('\n📋 Estado del deudor (debe permanecer):');
    if (debtor.rows.length > 0) {
      const d = debtor.rows[0];
      console.log(`   Nombre: ${d.fullName}`);
      console.log(`   Teléfono: ${d.phone}`);
      console.log(`   Deuda: $${d.debtAmount}`);
      console.log(`   Días mora: ${d.daysOverdue}`);
      console.log(`   Estado: ${d.status}`);
    } else {
      console.log('   ⚠️ No se encontró el deudor');
    }

    console.log('\n✅ Limpieza completada. Ahora puedes enviar un mensaje desde WhatsApp para probar el flujo completo.');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

limpiarDatosPrueba();
