// Script: Limpiar registros inválidos de paz_y_salvos
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function cleanInvalidRecords() {
  console.log('🧹 Limpiando registros inválidos de paz_y_salvos...\n');
  
  try {
    // Ver registros sin certificateNumber
    const invalidRecords = await pool.query(`
      SELECT id, "clientId", "createdAt"
      FROM paz_y_salvos
      WHERE "certificateNumber" IS NULL
    `);
    
    console.log(`❌ Registros sin certificateNumber: ${invalidRecords.rows.length}`);
    
    if (invalidRecords.rows.length > 0) {
      // Eliminar registros inválidos
      await pool.query('DELETE FROM paz_y_salvos WHERE "certificateNumber" IS NULL');
      console.log('✅ Registros inválidos eliminados\n');
    }
    
    // Verificar registros válidos
    const validRecords = await pool.query('SELECT COUNT(*) as count FROM paz_y_salvos');
    console.log(`📜 Registros válidos restantes: ${validRecords.rows[0].count}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanInvalidRecords();
