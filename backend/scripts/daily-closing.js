const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!',
});

async function dailyClosing() {
  const client = await pool.connect();
  
  try {
    console.log('============================================');
    console.log('  CIERRE DIARIO DEL SISTEMA - 7:00 PM');
    console.log(`  Fecha: ${new Date().toLocaleString('es-CO')}`);
    console.log('============================================\n');

    await client.query('BEGIN');

    // 1. Obtener estadísticas del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyStats = await client.query(`
      SELECT 
        COUNT(DISTINCT c.id) as chats_totales,
        COUNT(DISTINCT CASE WHEN c.status = 'closed' THEN c.id END) as chats_cerrados,
        COUNT(DISTINCT CASE WHEN c.status = 'resolved' THEN c.id END) as chats_resueltos,
        COUNT(DISTINCT CASE WHEN c.status IN ('waiting', 'active') THEN c.id END) as chats_pendientes,
        COUNT(DISTINCT m.id) as mensajes_enviados,
        COUNT(DISTINCT c."assignedAgentId") as agentes_trabajaron
      FROM chats c
      LEFT JOIN messages m ON c.id = m."chatId" AND m."createdAt" >= $1
      WHERE c."updatedAt" >= $1
    `, [today]);

    const stats = dailyStats.rows[0];

    // 2. Estadísticas por agente
    const agentStats = await client.query(`
      SELECT 
        u."fullName" as full_name,
        u.email,
        COUNT(DISTINCT c.id) as chats_atendidos,
        COUNT(DISTINCT CASE WHEN c.status = 'resolved' THEN c.id END) as chats_resueltos,
        COUNT(DISTINCT m.id) as mensajes_enviados,
        ROUND(AVG(EXTRACT(EPOCH FROM (c."closedAt" - c."assignedAt"))/60), 2) as tiempo_promedio_minutos
      FROM users u
      LEFT JOIN chats c ON c."assignedAgentId" = u.id AND c."updatedAt" >= $1
      LEFT JOIN messages m ON m."chatId" = c.id AND m."senderId" = u.id AND m."createdAt" >= $1
      WHERE u."isAgent" = true AND u.status = 'active'
      GROUP BY u.id, u."fullName", u.email
      ORDER BY chats_atendidos DESC
    `, [today]);

    // 3. Establecer todos los agentes en estado 'offline'
    const updateResult = await client.query(`
      UPDATE users 
      SET "agentState" = 'offline'
      WHERE "isAgent" = true AND status = 'active'
    `);

    console.log(`✓ ${updateResult.rowCount} agentes desactivados`);

    // 4. Generar reporte JSON
    const report = {
      fecha: today.toISOString().split('T')[0],
      hora_cierre: new Date().toISOString(),
      resumen_general: {
        chats_totales: parseInt(stats.chats_totales),
        chats_cerrados: parseInt(stats.chats_cerrados),
        chats_resueltos: parseInt(stats.chats_resueltos),
        chats_pendientes: parseInt(stats.chats_pendientes),
        mensajes_enviados: parseInt(stats.mensajes_enviados),
        agentes_trabajaron: parseInt(stats.agentes_trabajaron)
      },
      rendimiento_agentes: agentStats.rows.map(row => ({
        nombre: row.full_name,
        email: row.email,
        chats_atendidos: parseInt(row.chats_atendidos),
        chats_resueltos: parseInt(row.chats_resueltos),
        mensajes_enviados: parseInt(row.mensajes_enviados),
        tiempo_promedio_minutos: parseFloat(row.tiempo_promedio_minutos) || 0
      }))
    };

    // 5. Guardar reporte
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFilename = `reporte_${today.toISOString().split('T')[0]}.json`;
    const reportPath = path.join(reportsDir, reportFilename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✓ Reporte guardado: ${reportPath}`);

    // 6. Registrar operación de cierre
    await client.query(`
      INSERT INTO daily_operations (operation_type, operation_time, stats)
      VALUES ('closing', NOW(), $1)
    `, [JSON.stringify(report)]);

    await client.query('COMMIT');

    // Mostrar resumen en consola
    console.log('\n📊 RESUMEN DEL DÍA:');
    console.log(`  - Chats totales: ${stats.chats_totales}`);
    console.log(`  - Chats cerrados: ${stats.chats_cerrados}`);
    console.log(`  - Chats resueltos: ${stats.chats_resueltos}`);
    console.log(`  - Chats pendientes: ${stats.chats_pendientes}`);
    console.log(`  - Mensajes enviados: ${stats.mensajes_enviados}`);
    console.log(`  - Agentes que trabajaron: ${stats.agentes_trabajaron}`);

    if (agentStats.rows.length > 0) {
      console.log('\n👥 TOP 3 AGENTES:');
      agentStats.rows.slice(0, 3).forEach((agent, i) => {
        console.log(`  ${i + 1}. ${agent.full_name}`);
        console.log(`     - Chats: ${agent.chats_atendidos}, Resueltos: ${agent.chats_resueltos}`);
        console.log(`     - Tiempo promedio: ${agent.tiempo_promedio_minutos || 0} min`);
      });
    }

    console.log('\n✓ Sistema cerrado correctamente');
    console.log('============================================\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en cierre diario:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

dailyClosing();
