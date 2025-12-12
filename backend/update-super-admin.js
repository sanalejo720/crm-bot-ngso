const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function updateSuperAdmin() {
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

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Actualizar contraseña del super admin
    await client.query(`
      UPDATE users
      SET password = $1, status = 'active'
      WHERE email = 'admin@assoftware.xyz'
    `, [hashedPassword]);

    console.log('✅ Contraseña actualizada para admin@assoftware.xyz');
    console.log('\n📧 Credenciales actualizadas:');
    console.log('   Email: admin@assoftware.xyz');
    console.log('   Password: password123');
    console.log('   Role: Super Admin');
    
    console.log('\n   Email: san.alejo0720@gmail.com');
    console.log('   Password: password123');
    console.log('   Role: Administrador');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateSuperAdmin();
