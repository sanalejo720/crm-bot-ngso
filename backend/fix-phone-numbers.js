// Verificar y corregir datos en client_phone_numbers
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function fixPhoneNumbers() {
  console.log('🔧 Verificando datos en client_phone_numbers...\n');
  
  try {
    // Verificar registros con NULL
    const nullRecords = await pool.query(`
      SELECT id, "clientId", "phoneNumber"
      FROM client_phone_numbers
      WHERE "phoneNumber" IS NULL
    `);
    
    console.log(`❌ Registros con phoneNumber NULL: ${nullRecords.rows.length}`);
    
    if (nullRecords.rows.length > 0) {
      console.log('Eliminando registros inválidos...');
      await pool.query('DELETE FROM client_phone_numbers WHERE "phoneNumber" IS NULL');
      console.log('✅ Registros eliminados\n');
    }
    
    // Verificar longitud de columna actual
    const columnInfo = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'client_phone_numbers' 
        AND column_name = 'phoneNumber'
    `);
    
    if (columnInfo.rows.length > 0) {
      console.log('📊 Información de columna phoneNumber:');
      console.log(`   Tipo: ${columnInfo.rows[0].data_type}`);
      console.log(`   Longitud: ${columnInfo.rows[0].character_maximum_length || 'N/A'}\n`);
    }
    
    // Contar registros válidos
    const validCount = await pool.query('SELECT COUNT(*) as count FROM client_phone_numbers');
    console.log(`✅ Registros válidos: ${validCount.rows[0].count}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPhoneNumbers();
