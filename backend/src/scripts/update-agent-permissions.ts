// Script para actualizar permisos del rol Agente
// Remueve permisos 'manage', 'assign', 'transfer' y deja solo 'read' y 'update'

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Cargar variables de entorno
config({ path: join(__dirname, '../../.env') });

async function updateAgentPermissions() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_DATABASE || 'crm_whatsapp',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Conexión a base de datos establecida');

    // 1. Obtener el rol Agente
    const agentRole = await dataSource.query(
      `SELECT id FROM roles WHERE name = 'Agente' LIMIT 1`
    );

    if (!agentRole || agentRole.length === 0) {
      console.log('❌ No se encontró el rol Agente');
      return;
    }

    const agentRoleId = agentRole[0].id;
    console.log(`📋 Rol Agente encontrado: ${agentRoleId}`);

    // 2. Obtener permisos actuales del agente
    const currentPermissions = await dataSource.query(
      `SELECT p.module, p.action 
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp."permissionId"
       WHERE rp."roleId" = $1
       ORDER BY p.module, p.action`,
      [agentRoleId]
    );

    console.log('\n📊 Permisos actuales del Agente:');
    currentPermissions.forEach((p: any) => {
      console.log(`  - ${p.module}.${p.action}`);
    });

    // 3. Eliminar todos los permisos del agente
    await dataSource.query(
      `DELETE FROM role_permissions WHERE "roleId" = $1`,
      [agentRoleId]
    );
    console.log('\n🗑️  Permisos actuales eliminados');

    // 4. Obtener solo permisos 'read' y 'update' para módulos específicos
    const allowedPermissions = await dataSource.query(
      `SELECT id, module, action 
       FROM permissions 
       WHERE module IN ('chats', 'messages', 'clients', 'tasks')
       AND action IN ('read', 'update')
       ORDER BY module, action`
    );

    console.log('\n✨ Nuevos permisos a asignar:');
    allowedPermissions.forEach((p: any) => {
      console.log(`  - ${p.module}.${p.action}`);
    });

    // 5. Asignar nuevos permisos
    for (const permission of allowedPermissions) {
      await dataSource.query(
        `INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2)`,
        [agentRoleId, permission.id]
      );
    }

    console.log('\n✅ Permisos del rol Agente actualizados correctamente');
    console.log(`   Total de permisos: ${allowedPermissions.length}`);

    // 6. Verificar permisos finales
    const finalPermissions = await dataSource.query(
      `SELECT p.module, p.action 
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp."permissionId"
       WHERE rp."roleId" = $1
       ORDER BY p.module, p.action`,
      [agentRoleId]
    );

    console.log('\n📋 Permisos finales del Agente:');
    finalPermissions.forEach((p: any) => {
      console.log(`  - ${p.module}.${p.action}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar script
updateAgentPermissions()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
