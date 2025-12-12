const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!',
});

async function dailyOpening() {
  const client = await pool.connect();
  
  try {
    console.log('============================================');
    console.log('  APERTURA DIARIA DEL SISTEMA - 7:00 AM');
    console.log(`  Fecha: ${new Date().toLocaleString('es-CO')}`);
    console.log('============================================\n');

    await client.query('BEGIN');

    // 1. Establecer todos los agentes en estado 'available'
    const updateResult = await client.query(`
      UPDATE users 
      SET "agentState" = 'available'
      WHERE "isAgent" = true AND status = 'active'
    `);

    console.log(`✓ ${updateResult.rowCount} agentes activados`);

    // 2. Obtener estadísticas del día anterior
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const stats = await client.query(`
      SELECT 
        COUNT(DISTINCT c.id) as chats_cerrados,
        COUNT(DISTINCT CASE WHEN c.status = 'resolved' THEN c.id END) as chats_resueltos,
        COUNT(DISTINCT m.id) as mensajes_totales,
        COUNT(DISTINCT c."assignedAgentId") as agentes_activos
      FROM chats c
      LEFT JOIN messages m ON c.id = m."chatId"
      WHERE c."updatedAt" >= $1 AND c."updatedAt" < CURRENT_DATE
    `, [yesterday]);

    const yesterdayStats = stats.rows[0];

    // 3. Registrar operación de apertura
    await client.query(`
      INSERT INTO daily_operations (operation_type, operation_time, stats)
      VALUES ('opening', NOW(), $1)
    `, [JSON.stringify({
      agentes_activados: updateResult.rowCount,
      estadisticas_dia_anterior: {
        chats_cerrados: parseInt(yesterdayStats.chats_cerrados),
        chats_resueltos: parseInt(yesterdayStats.chats_resueltos),
        mensajes_totales: parseInt(yesterdayStats.mensajes_totales),
        agentes_activos: parseInt(yesterdayStats.agentes_activos)
      }
    })]);

    await client.query('COMMIT');

    console.log('\nEstadísticas del día anterior:');
    console.log(`  - Chats cerrados: ${yesterdayStats.chats_cerrados}`);
    console.log(`  - Chats resueltos: ${yesterdayStats.chats_resueltos}`);
    console.log(`  - Mensajes totales: ${yesterdayStats.mensajes_totales}`);
    console.log(`  - Agentes que trabajaron: ${yesterdayStats.agentes_activos}`);

    console.log('\n✓ Sistema abierto y listo para operar');
    console.log('============================================\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en apertura diaria:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

dailyOpening();
