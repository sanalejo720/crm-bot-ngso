// Script para agregar permisos de evidencias
// Ejecutar: node crear-permisos-evidencias.js

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function crearPermisos() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creando permisos de evidencias...');

    // 1. Crear permisos
    await client.query(`
      INSERT INTO permissions (id, module, action, description, "createdAt")
      VALUES 
        (gen_random_uuid(), 'evidences', 'read', 'Ver evidencias de pago', NOW()),
        (gen_random_uuid(), 'evidences', 'download', 'Descargar PDFs de evidencias', NOW())
      ON CONFLICT (module, action) DO NOTHING
    `);

    console.log('✅ Permisos creados');

    // 2. Asignar a Supervisor
    await client.query(`
      INSERT INTO role_permissions ("roleId", "permissionId")
      SELECT 
        r.id,
        p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'Supervisor'
        AND p.module = 'evidences'
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Permisos asignados a Supervisor');

    // 3. Asignar a Super Admin
    await client.query(`
      INSERT INTO role_permissions ("roleId", "permissionId")
      SELECT 
        r.id,
        p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'Super Admin'
        AND p.module = 'evidences'
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Permisos asignados a Super Admin');

    // 4. Asignar a Administrador
    await client.query(`
      INSERT INTO role_permissions ("roleId", "permissionId")
      SELECT 
        r.id,
        p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'Administrador'
        AND p.module = 'evidences'
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Permisos asignados a Administrador');
    console.log('🎉 Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

crearPermisos()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
