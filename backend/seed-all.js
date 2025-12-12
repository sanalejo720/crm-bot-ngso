const { DataSource } = require("typeorm");

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "crm_admin",
  password: "CRM_NgsoPass2024!",
  database: "crm_whatsapp",
});

async function seedAll() {
  try {
    await AppDataSource.initialize();
    console.log("✅ Conectado a la base de datos\n");

    // 1. CREAR PERMISOS
    console.log("📋 Creando permisos...");
    
    const modules = [
      'users',
      'roles',
      'campaigns',
      'whatsapp',
      'chats',
      'messages',
      'clients',
      'tasks',
      'bot',
      'reports',
      'audit',
      'settings',
      'templates',
      'unidentified_clients',
      'backups',
      'payment_evidences',
      'quick_replies',
      'monitoring',
      'debtors',
    ];

    const actions = ['create', 'read', 'update', 'delete'];

    const specialPermissions = [
      { module: 'chats', action: 'assign' },
      { module: 'chats', action: 'transfer' },
      { module: 'chats', action: 'close' },
      { module: 'chats', action: 'manage' },
      { module: 'users', action: 'activate' },
      { module: 'users', action: 'deactivate' },
      { module: 'campaigns', action: 'activate' },
      { module: 'campaigns', action: 'pause' },
      { module: 'reports', action: 'export' },
      { module: 'whatsapp', action: 'send' },
      { module: 'templates', action: 'use' },
      { module: 'debtors', action: 'upload' },
      { module: 'debtors', action: 'import' },
    ];

    let permissionsCreated = 0;

    // Crear permisos básicos
    for (const module of modules) {
      for (const action of actions) {
        const exists = await AppDataSource.query(
          'SELECT id FROM permissions WHERE module = $1 AND action = $2',
          [module, action]
        );

        if (exists.length === 0) {
          await AppDataSource.query(
            'INSERT INTO permissions (id, module, action, description, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW())',
            [module, action, `${action} ${module}`]
          );
          permissionsCreated++;
          console.log(`  ✓ ${module}.${action}`);
        }
      }
    }

    // Crear permisos especiales
    for (const { module, action } of specialPermissions) {
      const exists = await AppDataSource.query(
        'SELECT id FROM permissions WHERE module = $1 AND action = $2',
        [module, action]
      );

      if (exists.length === 0) {
        await AppDataSource.query(
          'INSERT INTO permissions (id, module, action, description, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW())',
          [module, action, `${action} ${module}`]
        );
        permissionsCreated++;
        console.log(`  ✓ ${module}.${action} (especial)`);
      }
    }

    console.log(`\n✅ ${permissionsCreated} permisos creados\n`);

    // 2. ASIGNAR TODOS LOS PERMISOS AL SUPERADMIN
    console.log("🔑 Asignando permisos al rol superadmin...");
    
    const role = await AppDataSource.query(
      'SELECT id FROM roles WHERE name = $1',
      ['superadmin']
    );

    if (role.length === 0) {
      console.error("❌ Rol superadmin no encontrado");
      process.exit(1);
    }

    const roleId = role[0].id;
    const allPermissions = await AppDataSource.query('SELECT id FROM permissions');

    let permissionsAssigned = 0;
    for (const perm of allPermissions) {
      await AppDataSource.query(
        'INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roleId, perm.id]
      );
      permissionsAssigned++;
    }

    console.log(`✅ ${permissionsAssigned} permisos asignados al superadmin\n`);

    // 3. VERIFICAR
    const finalCount = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM role_permissions WHERE "roleId" = $1',
      [roleId]
    );

    console.log("🎉 ¡Completado!");
    console.log(`   Total de permisos del superadmin: ${finalCount[0].count}`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedAll();
