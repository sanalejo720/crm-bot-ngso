// Script para ejecutar migración de Paz y Salvo
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function runMigration() {
  console.log('🔧 Iniciando migración de Paz y Salvo...\n');
  
  try {
    const sqlPath = path.join(__dirname, 'scripts', 'create-paz-y-salvo-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente\n');
    
    // Verificar tablas creadas
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('client_phone_numbers', 'paz_y_salvos')
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas creadas:');
    tablesCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    console.log('');
    
    // Verificar registros iniciales
    const phoneCount = await pool.query('SELECT COUNT(*) as count FROM client_phone_numbers');
    console.log(`📱 Teléfonos migrados: ${phoneCount.rows[0].count}`);
    
    const pazCount = await pool.query('SELECT COUNT(*) as count FROM paz_y_salvos');
    console.log(`📜 Paz y salvos: ${pazCount.rows[0].count}\n`);
    
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

runMigration();
