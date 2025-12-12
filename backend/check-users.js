// Verificar usuarios en la base de datos
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function checkUsers() {
  console.log('👥 Verificando usuarios en la base de datos...\n');
  
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u."userName" as username,
        u.email,
        u."fullName",
        r.name as role
      FROM users u
      LEFT JOIN roles r ON u."roleId" = r.id
      ORDER BY r.name, u."userName"
      LIMIT 10
    `);
    
    console.log(`✅ Usuarios encontrados: ${result.rows.length}\n`);
    
    if (result.rows.length === 0) {
      console.log('⚠️ No hay usuarios en la base de datos\n');
    } else {
      console.log('📋 Usuarios:\n');
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.fullName || user.username}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
