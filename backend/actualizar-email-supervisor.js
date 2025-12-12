const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function updateSupervisorEmail() {
  try {
    console.log('🔧 Actualizando email del supervisor...\n');
    
    // Obtener el Super Admin actual
    const currentUser = await pool.query(`
      SELECT u.id, u."fullName", u.email, r.name as role
      FROM users u
      INNER JOIN roles r ON u."roleId" = r.id
      WHERE r.name = 'Super Admin'
      LIMIT 1
    `);
    
    if (currentUser.rows.length === 0) {
      console.log('❌ No se encontró ningún Super Admin');
      return;
    }
    
    const user = currentUser.rows[0];
    console.log(`Usuario encontrado: ${user.fullName}`);
    console.log(`Email actual: ${user.email}`);
    console.log('');
    
    // Actualizar a un email real donde puedas recibir las contraseñas
    const newEmail = 'san.alejo0720@gmail.com'; // Email configurado en BACKUP_EMAIL_RECIPIENT
    
    await pool.query(`
      UPDATE users 
      SET email = $1 
      WHERE id = $2
    `, [newEmail, user.id]);
    
    console.log(`✅ Email actualizado a: ${newEmail}`);
    console.log('');
    console.log('💡 Ahora cuando hagas un cierre de negociación, la contraseña se enviará a este email');
    console.log('   Asegúrate de revisar la bandeja de entrada y la carpeta de SPAM');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateSupervisorEmail();
