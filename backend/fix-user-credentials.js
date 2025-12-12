const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function checkAndCreateUser() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    database: 'crm_whatsapp'
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Verificar si el usuario existe
    const userCheck = await client.query(`
      SELECT id, email, "fullName", status
      FROM users
      WHERE email = 'san.alejo0720@gmail.com'
    `);

    if (userCheck.rows.length > 0) {
      const user = userCheck.rows[0];
      console.log('👤 Usuario encontrado:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Nombre: ${user.fullName}`);
      console.log(`   Status: ${user.status}`);
      console.log('\n🔄 Actualizando contraseña...');

      // Actualizar contraseña
      const hashedPassword = await bcrypt.hash('password123', 10);
      await client.query(`
        UPDATE users
        SET password = $1, status = 'active'
        WHERE email = 'san.alejo0720@gmail.com'
      `, [hashedPassword]);

      console.log('✅ Contraseña actualizada a: password123');
    } else {
      console.log('❌ Usuario no encontrado. Creando nuevo usuario...\n');

      // Buscar rol de admin
      const roleResult = await client.query(`
        SELECT id FROM roles WHERE name = 'admin' LIMIT 1
      `);

      if (roleResult.rows.length === 0) {
        console.log('❌ No se encontró el rol admin');
        await client.end();
        return;
      }

      const roleId = roleResult.rows[0].id;
      const hashedPassword = await bcrypt.hash('password123', 10);

      // Crear usuario
      await client.query(`
        INSERT INTO users (
          email,
          password,
          "fullName",
          status,
          "roleId",
          "createdAt",
          "updatedAt"
        ) VALUES (
          'san.alejo0720@gmail.com',
          $1,
          'Alejandro Sanchez',
          'active',
          $2,
          NOW(),
          NOW()
        )
      `, [hashedPassword, roleId]);

      console.log('✅ Usuario creado exitosamente');
      console.log('   Email: san.alejo0720@gmail.com');
      console.log('   Password: password123');
      console.log('   Role: admin');
    }

    // Listar todos los usuarios
    console.log('\n📋 Usuarios en el sistema:');
    const allUsers = await client.query(`
      SELECT email, "fullName", status
      FROM users
      ORDER BY email
    `);

    allUsers.rows.forEach(user => {
      const statusIcon = user.status === 'active' ? '✅' : '❌';
      console.log(`   ${statusIcon} ${user.email} - ${user.fullName} (${user.status})`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkAndCreateUser();
