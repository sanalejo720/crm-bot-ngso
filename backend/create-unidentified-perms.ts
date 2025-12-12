// Script simple para crear permisos de clientes no identificados
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'Amatista.720',
  database: 'crm_gestion',
});

async function createPermissions() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Conectado a la base de datos');

    // Obtener Super Admin
    const superAdminResult = await AppDataSource.query(
      `SELECT id FROM roles WHERE name = 'Super Admin'`
    );

    if (superAdminResult.length === 0) {
      console.log('❌ No se encontró el rol Super Admin');
      return;
    }

    const superAdminId = superAdminResult[0].id;
    console.log('✅ Super Admin ID:', superAdminId);

    // Crear permisos
    console.log('\n📝 Creando permisos...');
    await AppDataSource.query(`
      INSERT INTO permissions (id, name, description, resource, action, "createdAt", "updatedAt")
      VALUES 
        (gen_random_uuid(), 'unidentified_clients:create', 'Crear clientes no identificados', 'unidentified_clients', 'create', NOW(), NOW()),
        (gen_random_uuid(), 'unidentified_clients:read', 'Ver clientes no identificados', 'unidentified_clients', 'read', NOW(), NOW()),
        (gen_random_uuid(), 'unidentified_clients:update', 'Actualizar clientes no identificados', 'unidentified_clients', 'update', NOW(), NOW()),
        (gen_random_uuid(), 'unidentified_clients:delete', 'Eliminar clientes no identificados', 'unidentified_clients', 'delete', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
      RETURNING name
    `);

    console.log('✅ Permisos creados');

    // Asignar permisos al Super Admin
    console.log('\n📝 Asignando permisos al Super Admin...');
    const assigned = await AppDataSource.query(`
      INSERT INTO role_permissions ("roleId", "permissionId")
      SELECT $1, id FROM permissions WHERE resource = 'unidentified_clients'
      ON CONFLICT DO NOTHING
      RETURNING "permissionId"
    `, [superAdminId]);

    console.log(`✅ ${assigned.length} permisos asignados`);

    // Verificar permisos
    const perms = await AppDataSource.query(`
      SELECT p.name
      FROM permissions p
      INNER JOIN role_permissions rp ON rp."permissionId" = p.id
      WHERE rp."roleId" = $1 AND p.resource = 'unidentified_clients'
    `, [superAdminId]);

    console.log('\n📋 Permisos de Super Admin para unidentified_clients:');
    perms.forEach((p: any) => console.log(`  ✓ ${p.name}`));

    console.log('\n✅ ¡Completado! Cierra sesión y vuelve a iniciar sesión para actualizar los permisos.');

    await AppDataSource.destroy();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

createPermissions();
