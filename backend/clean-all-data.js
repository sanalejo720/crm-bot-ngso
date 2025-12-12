const { DataSource } = require("typeorm");

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "crm_admin",
  password: "CRM_NgsoPass2024!",
  database: "crm_whatsapp",
});

async function cleanAllData() {
  try {
    await AppDataSource.initialize();
    console.log("✅ Conectado a la base de datos\n");

    console.log("🧹 Limpiando datos de prueba...\n");

    // Tablas a limpiar (en orden para respetar foreign keys)
    const tablesToClean = [
      { name: 'messages', desc: 'Mensajes' },
      { name: 'tasks', desc: 'Tareas' },
      { name: 'chats', desc: 'Chats' },
      { name: 'payment_evidences', desc: 'Evidencias de pago' },
      { name: 'evidences', desc: 'Evidencias' },
      { name: 'paz_y_salvos', desc: 'Paz y Salvos' },
      { name: 'debtors', desc: 'Deudores' },
      { name: 'client_phone_numbers', desc: 'Números de teléfono de clientes' },
      { name: 'clients', desc: 'Clientes' },
      { name: 'unidentified_clients', desc: 'Clientes no identificados' },
      { name: 'campaigns', desc: 'Campañas' },
      { name: 'whatsapp_numbers', desc: 'Números WhatsApp' },
      { name: 'quick_replies', desc: 'Respuestas rápidas' },
      { name: 'audit_logs', desc: 'Logs de auditoría' },
    ];

    for (const table of tablesToClean) {
      const count = await AppDataSource.query(
        `SELECT COUNT(*) as count FROM ${table.name}`
      );
      
      if (parseInt(count[0].count) > 0) {
        await AppDataSource.query(`DELETE FROM ${table.name}`);
        console.log(`  ✓ ${table.desc}: ${count[0].count} registros eliminados`);
      } else {
        console.log(`  ℹ️  ${table.desc}: Ya está vacía`);
      }
    }

    // NO eliminamos:
    // - users (mantener usuario admin)
    // - roles (mantener roles del sistema)
    // - permissions (mantener permisos)
    // - role_permissions (mantener asignaciones)
    // - bot_flows (mantener flujo importado)
    // - bot_nodes (mantener nodos del flujo)
    // - backups (mantener backups si existen)

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 ¡Limpieza completada!");
    console.log("\nTablas preservadas:");
    console.log("  ✓ users (usuario admin)");
    console.log("  ✓ roles y permissions");
    console.log("  ✓ bot_flows y bot_nodes");
    console.log("  ✓ backups");

    // Mostrar resumen
    const summary = await AppDataSource.query(`
      SELECT 
        'users' as tabla, COUNT(*) as registros FROM users
      UNION ALL
      SELECT 'roles', COUNT(*) FROM roles
      UNION ALL
      SELECT 'permissions', COUNT(*) FROM permissions
      UNION ALL
      SELECT 'bot_flows', COUNT(*) FROM bot_flows
      UNION ALL
      SELECT 'bot_nodes', COUNT(*) FROM bot_nodes
      UNION ALL
      SELECT 'chats', COUNT(*) FROM chats
      UNION ALL
      SELECT 'messages', COUNT(*) FROM messages
      UNION ALL
      SELECT 'debtors', COUNT(*) FROM debtors
      UNION ALL
      SELECT 'campaigns', COUNT(*) FROM campaigns
    `);

    console.log("\n📊 Estado de las tablas:");
    summary.forEach(row => {
      console.log(`  ${row.tabla.padEnd(20)} → ${row.registros} registros`);
    });

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.detail) console.error("   Detalle:", error.detail);
    process.exit(1);
  }
}

cleanAllData();
