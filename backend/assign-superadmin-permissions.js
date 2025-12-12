const { DataSource } = require("typeorm");

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "crm_admin",
  password: "CRM_NgsoPass2024!",
  database: "crm_whatsapp",
});

async function assignPermissions() {
  try {
    await AppDataSource.initialize();
    console.log("Conectado a la base de datos");

    // Obtener el rol superadmin
    const role = await AppDataSource.query(
      "SELECT id FROM roles WHERE name = $1",
      ["superadmin"]
    );

    if (!role || role.length === 0) {
      console.error("❌ Rol superadmin no encontrado");
      process.exit(1);
    }

    const roleId = role[0].id;
    console.log("✅ Rol superadmin encontrado:", roleId);

    // Obtener todos los permisos
    const permissions = await AppDataSource.query("SELECT id FROM permissions");
    console.log(`📋 Total de permisos en la base de datos: ${permissions.length}`);

    // Verificar permisos actuales
    const currentPerms = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM role_permissions WHERE "roleId" = $1',
      [roleId]
    );
    console.log(`📊 Permisos actuales del superadmin: ${currentPerms[0].count}`);

    // Asignar todos los permisos al rol superadmin
    let assigned = 0;
    for (const perm of permissions) {
      try {
        await AppDataSource.query(
          'INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roleId, perm.id]
        );
        assigned++;
      } catch (error) {
        // Ignorar duplicados
      }
    }

    console.log(`✅ ${assigned} permisos asignados al rol superadmin`);

    // Verificar permisos finales
    const finalPerms = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM role_permissions WHERE "roleId" = $1',
      [roleId]
    );
    console.log(`🎉 Total de permisos del superadmin: ${finalPerms[0].count}`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

assignPermissions();
