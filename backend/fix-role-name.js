const { DataSource } = require("typeorm");

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "crm_admin",
  password: "CRM_NgsoPass2024!",
  database: "crm_whatsapp",
});

async function fixRoleName() {
  try {
    await AppDataSource.initialize();
    console.log("✅ Conectado a la base de datos\n");

    // Actualizar el nombre del rol
    await AppDataSource.query(
      "UPDATE roles SET name = $1 WHERE name = $2",
      ['Super Admin', 'superadmin']
    );

    console.log("✅ Rol actualizado de 'superadmin' a 'Super Admin'");

    // Verificar
    const roles = await AppDataSource.query(
      "SELECT name FROM roles ORDER BY name"
    );

    console.log("\n📋 Roles en el sistema:");
    roles.forEach(r => console.log(`  - ${r.name}`));

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixRoleName();
