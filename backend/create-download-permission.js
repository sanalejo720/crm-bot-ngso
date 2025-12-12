// Script: Crear permiso evidences:download
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function createDownloadPermission() {
  console.log('🔐 Creando permiso evidences:download...\n');
  
  try {
    // Verificar si ya existe
    const existingPerm = await pool.query(`
      SELECT id FROM permissions WHERE module = 'evidences' AND action = 'download'
    `);
    
    if (existingPerm.rows.length > 0) {
      console.log('⚠️  Permiso ya existe\n');
      return;
    }
    
    // Crear permiso
    await pool.query(`
      INSERT INTO permissions (module, action, description)
      VALUES ('evidences', 'download', 'Descargar evidencias de pago')
    `);
    
    console.log('✅ Permiso creado: evidences:download\n');
    
    // Asignar a Supervisores y Super Admins
    const roles = await pool.query(`
      SELECT id, name FROM roles WHERE name IN ('Supervisor', 'Super Admin')
    `);
    
    const permission = await pool.query(`
      SELECT id FROM permissions WHERE module = 'evidences' AND action = 'download'
    `);
    
    for (const role of roles.rows) {
      await pool.query(`
        INSERT INTO role_permissions ("roleId", "permissionId")
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [role.id, permission.rows[0].id]);
      
      console.log(`✅ Permiso asignado a: ${role.name}`);
    }
    
    console.log('\n✅ Configuración completada\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createDownloadPermission();
