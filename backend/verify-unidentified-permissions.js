// Script para verificar y crear permisos de clientes no identificados
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'crm_gestion',
  user: 'postgres',
  password: 'Amatista.720'
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Verificar si existen los permisos
    const checkPerms = await client.query(`
      SELECT name FROM permissions WHERE resource = 'unidentified_clients'
    `);

    console.log('\n📋 Permisos existentes para unidentified_clients:');
    checkPerms.rows.forEach(row => console.log(`  - ${row.name}`));

    if (checkPerms.rows.length === 0) {
      console.log('\n⚠️  No se encontraron permisos, creándolos...');
      
      // Crear permisos
      await client.query(`
        INSERT INTO permissions (id, name, description, resource, action, "createdAt", "updatedAt")
        VALUES 
          (gen_random_uuid(), 'unidentified_clients:create', 'Crear clientes no identificados', 'unidentified_clients', 'create', NOW(), NOW()),
          (gen_random_uuid(), 'unidentified_clients:read', 'Ver clientes no identificados', 'unidentified_clients', 'read', NOW(), NOW()),
          (gen_random_uuid(), 'unidentified_clients:update', 'Actualizar clientes no identificados', 'unidentified_clients', 'update', NOW(), NOW()),
          (gen_random_uuid(), 'unidentified_clients:delete', 'Eliminar clientes no identificados', 'unidentified_clients', 'delete', NOW(), NOW())
        ON CONFLICT (name) DO NOTHING
      `);
      
      console.log('✅ Permisos creados');
    }

    // Verificar Super Admin
    const superAdmin = await client.query(`
      SELECT id, name FROM roles WHERE name = 'Super Admin'
    `);

    if (superAdmin.rows.length === 0) {
      console.log('\n❌ No se encontró el rol Super Admin');
      process.exit(1);
    }

    const superAdminId = superAdmin.rows[0].id;
    console.log(`\n✅ Rol Super Admin encontrado: ${superAdminId}`);

    // Asignar permisos a Super Admin
    await client.query(`
      INSERT INTO role_permissions ("roleId", "permissionId")
      SELECT $1, id FROM permissions WHERE resource = 'unidentified_clients'
      ON CONFLICT DO NOTHING
    `, [superAdminId]);

    console.log('✅ Permisos asignados a Super Admin');

    // Verificar permisos del Super Admin
    const adminPerms = await client.query(`
      SELECT p.name, p.resource, p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON rp."permissionId" = p.id
      INNER JOIN roles r ON r.id = rp."roleId"
      WHERE r.name = 'Super Admin' AND p.resource = 'unidentified_clients'
    `);

    console.log('\n📋 Permisos de Super Admin para unidentified_clients:');
    adminPerms.rows.forEach(row => {
      console.log(`  ✓ ${row.name} (${row.resource}:${row.action})`);
    });

    // Verificar usuario admin
    const adminUser = await client.query(`
      SELECT u.email, u."firstName", u."lastName", r.name as role_name
      FROM users u
      INNER JOIN roles r ON r.id = u."roleId"
      WHERE u.email = 'admin@crm.com'
    `);

    if (adminUser.rows.length > 0) {
      console.log('\n👤 Usuario admin@crm.com:');
      console.log(`   Nombre: ${adminUser.rows[0].firstName} ${adminUser.rows[0].lastName}`);
      console.log(`   Rol: ${adminUser.rows[0].role_name}`);
    }

    console.log('\n✅ Verificación completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
