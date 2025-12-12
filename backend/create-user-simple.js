const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createUser() {
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

    // Ver roles existentes
    console.log('📋 Roles en el sistema:');
    const rolesResult = await client.query('SELECT id, name, description FROM roles ORDER BY name');
    rolesResult.rows.forEach(role => {
      console.log(`   ${role.name}: ${role.description || 'Sin descripción'} (${role.id})`);
    });

    if (rolesResult.rows.length === 0) {
      console.log('\n❌ No hay roles en el sistema. Debes crearlos primero.');
      await client.end();
      return;
    }

    // Tomar el primer rol (probablemente admin o super_admin)
    const roleId = rolesResult.rows[0].id;
    console.log(`\n✅ Usando rol: ${rolesResult.rows[0].name}`);

    // Verificar si existe el usuario
    const userCheck = await client.query(`
      SELECT id FROM users WHERE email = 'san.alejo0720@gmail.com'
    `);

    const hashedPassword = await bcrypt.hash('password123', 10);

    if (userCheck.rows.length > 0) {
      // Actualizar
      await client.query(`
        UPDATE users
        SET password = $1, status = 'active'
        WHERE email = 'san.alejo0720@gmail.com'
      `, [hashedPassword]);
      console.log('\n✅ Usuario actualizado');
    } else {
      // Crear
      await client.query(`
        INSERT INTO users (
          email,
          password,
          "fullName",
          status,
          "roleId",
          "isAgent",
          "maxConcurrentChats",
          "currentChatsCount",
          "twoFactorEnabled",
          "createdAt",
          "updatedAt"
        ) VALUES (
          'san.alejo0720@gmail.com',
          $1,
          'Alejandro Sanchez',
          'active',
          $2,
          false,
          5,
          0,
          false,
          NOW(),
          NOW()
        )
      `, [hashedPassword, roleId]);
      console.log('\n✅ Usuario creado');
    }

    console.log('\n📧 Credenciales:');
    console.log('   Email: san.alejo0720@gmail.com');
    console.log('   Password: password123');

    // Listar usuarios
    console.log('\n📋 Todos los usuarios:');
    const users = await client.query(`
      SELECT u.email, u."fullName", u.status, r.name as role
      FROM users u
      LEFT JOIN roles r ON u."roleId" = r.id
      ORDER BY u.email
    `);

    users.rows.forEach(user => {
      const icon = user.status === 'active' ? '✅' : '❌';
      console.log(`   ${icon} ${user.email} - ${user.fullName} (${user.role || 'sin rol'})`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createUser();
