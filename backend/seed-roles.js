const { DataSource } = require("typeorm");

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "crm_admin",
  password: "CRM_NgsoPass2024!",
  database: "crm_whatsapp",
});

async function seedRoles() {
  try {
    await AppDataSource.initialize();
    console.log("✅ Conectado a la base de datos\n");

    // SUPERVISOR - Gestión completa de operaciones
    console.log("👨‍💼 Creando rol Supervisor...");
    
    const supervisorModules = ['campaigns', 'chats', 'messages', 'clients', 'tasks', 'reports', 'users', 'whatsapp', 'templates', 'debtors', 'bot', 'quick_replies', 'monitoring', 'payment_evidences', 'unidentified_clients'];
    
    const supervisorPermissions = await AppDataSource.query(
      `SELECT id FROM permissions WHERE module = ANY($1)`,
      [supervisorModules]
    );

    let supervisor = await AppDataSource.query(
      "SELECT id FROM roles WHERE name = 'Supervisor'"
    );

    if (supervisor.length === 0) {
      const newRole = await AppDataSource.query(
        `INSERT INTO roles (id, name, description, "isActive", "isSystem", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, true, true, NOW(), NOW()) RETURNING id`,
        ['Supervisor', 'Supervisión de operaciones y reportes']
      );
      supervisor = newRole;
      console.log("  ✓ Rol creado");
    } else {
      console.log("  ℹ️ Rol ya existe");
    }

    const supervisorId = supervisor[0].id;

    // Limpiar permisos anteriores
    await AppDataSource.query(
      `DELETE FROM role_permissions WHERE "roleId" = $1`,
      [supervisorId]
    );

    // Asignar permisos
    for (const perm of supervisorPermissions) {
      await AppDataSource.query(
        `INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2)`,
        [supervisorId, perm.id]
      );
    }

    console.log(`  ✅ ${supervisorPermissions.length} permisos asignados\n`);

    // AGENTE - Atención de chats
    console.log("👤 Creando rol Agente...");
    
    const agentQuery = `
      SELECT id FROM permissions 
      WHERE module IN ('chats', 'messages', 'clients', 'tasks', 'templates', 'quick_replies')
      AND action IN ('read', 'create', 'update')
    `;
    
    const agentPermissions = await AppDataSource.query(agentQuery);

    let agent = await AppDataSource.query(
      "SELECT id FROM roles WHERE name = 'Agente'"
    );

    if (agent.length === 0) {
      const newRole = await AppDataSource.query(
        `INSERT INTO roles (id, name, description, "isActive", "isSystem", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, true, true, NOW(), NOW()) RETURNING id`,
        ['Agente', 'Atención de chats y gestión de clientes']
      );
      agent = newRole;
      console.log("  ✓ Rol creado");
    } else {
      console.log("  ℹ️ Rol ya existe");
    }

    const agentId = agent[0].id;

    // Limpiar permisos anteriores
    await AppDataSource.query(
      `DELETE FROM role_permissions WHERE "roleId" = $1`,
      [agentId]
    );

    // Asignar permisos
    for (const perm of agentPermissions) {
      await AppDataSource.query(
        `INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2)`,
        [agentId, perm.id]
      );
    }

    console.log(`  ✅ ${agentPermissions.length} permisos asignados\n`);

    // ADMINISTRADOR - Similar a Supervisor pero sin backups
    console.log("🔧 Creando rol Administrador...");
    
    const adminModules = ['campaigns', 'chats', 'messages', 'clients', 'tasks', 'reports', 'users', 'whatsapp', 'templates', 'debtors', 'bot', 'quick_replies', 'monitoring', 'payment_evidences', 'unidentified_clients', 'roles', 'settings'];
    
    const adminPermissions = await AppDataSource.query(
      `SELECT id FROM permissions WHERE module = ANY($1)`,
      [adminModules]
    );

    let admin = await AppDataSource.query(
      "SELECT id FROM roles WHERE name = 'Administrador'"
    );

    if (admin.length === 0) {
      const newRole = await AppDataSource.query(
        `INSERT INTO roles (id, name, description, "isActive", "isSystem", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, true, true, NOW(), NOW()) RETURNING id`,
        ['Administrador', 'Administración completa del sistema']
      );
      admin = newRole;
      console.log("  ✓ Rol creado");
    } else {
      console.log("  ℹ️ Rol ya existe");
    }

    const adminId = admin[0].id;

    // Limpiar permisos anteriores
    await AppDataSource.query(
      `DELETE FROM role_permissions WHERE "roleId" = $1`,
      [adminId]
    );

    // Asignar permisos
    for (const perm of adminPermissions) {
      await AppDataSource.query(
        `INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2)`,
        [adminId, perm.id]
      );
    }

    console.log(`  ✅ ${adminPermissions.length} permisos asignados\n`);

    // CALIDAD - Solo lectura
    console.log("🎯 Creando rol Calidad...");
    
    const qualityQuery = `
      SELECT id FROM permissions 
      WHERE module IN ('chats', 'messages', 'reports', 'audit', 'clients')
      AND action = 'read'
    `;
    
    const qualityPermissions = await AppDataSource.query(qualityQuery);

    let quality = await AppDataSource.query(
      "SELECT id FROM roles WHERE name = 'Calidad'"
    );

    if (quality.length === 0) {
      const newRole = await AppDataSource.query(
        `INSERT INTO roles (id, name, description, "isActive", "isSystem", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, true, true, NOW(), NOW()) RETURNING id`,
        ['Calidad', 'Monitoreo y auditoría de calidad']
      );
      quality = newRole;
      console.log("  ✓ Rol creado");
    } else {
      console.log("  ℹ️ Rol ya existe");
    }

    const qualityId = quality[0].id;

    // Limpiar permisos anteriores
    await AppDataSource.query(
      `DELETE FROM role_permissions WHERE "roleId" = $1`,
      [qualityId]
    );

    // Asignar permisos
    for (const perm of qualityPermissions) {
      await AppDataSource.query(
        `INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2)`,
        [qualityId, perm.id]
      );
    }

    console.log(`  ✅ ${qualityPermissions.length} permisos asignados\n`);

    // AUDITORÍA - Solo lectura en todo
    console.log("📊 Creando rol Auditoría...");
    
    const auditPermissions = await AppDataSource.query(
      `SELECT id FROM permissions WHERE action = 'read'`
    );

    let audit = await AppDataSource.query(
      "SELECT id FROM roles WHERE name = 'Auditoría'"
    );

    if (audit.length === 0) {
      const newRole = await AppDataSource.query(
        `INSERT INTO roles (id, name, description, "isActive", "isSystem", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, true, true, NOW(), NOW()) RETURNING id`,
        ['Auditoría', 'Acceso solo lectura para auditoría']
      );
      audit = newRole;
      console.log("  ✓ Rol creado");
    } else {
      console.log("  ℹ️ Rol ya existe");
    }

    const auditId = audit[0].id;

    // Limpiar permisos anteriores
    await AppDataSource.query(
      `DELETE FROM role_permissions WHERE "roleId" = $1`,
      [auditId]
    );

    // Asignar permisos
    for (const perm of auditPermissions) {
      await AppDataSource.query(
        `INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2)`,
        [auditId, perm.id]
      );
    }

    console.log(`  ✅ ${auditPermissions.length} permisos asignados\n`);

    // RESUMEN FINAL
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 ¡Roles creados exitosamente!\n");

    const rolesSummary = await AppDataSource.query(`
      SELECT r.name, COUNT(rp."permissionId") as permisos
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);

    console.log("📋 Resumen de permisos por rol:");
    rolesSummary.forEach(r => {
      console.log(`  ${r.name.padEnd(20)} → ${r.permisos} permisos`);
    });

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedRoles();
