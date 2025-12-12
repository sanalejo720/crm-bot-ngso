// Ejecutar script SQL para eliminar columna password
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

async function runSQL() {
  console.log('🔧 Eliminando columna encryptedPassword...\n');
  
  try {
    const sqlPath = path.join(__dirname, 'scripts', 'remove-password-column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Columna eliminada exitosamente\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

runSQL();
