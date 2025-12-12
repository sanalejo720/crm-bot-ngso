const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function checkEmailLogs() {
  try {
    console.log('🔍 Verificando configuración de emails y evidencias...\n');
    
    // 1. Verificar supervisores con email
    console.log('👥 SUPERVISORES CON EMAIL:');
    const supervisors = await pool.query(`
      SELECT u.id, u."fullName", u.email, r.name as role
      FROM users u
      INNER JOIN roles r ON u."roleId" = r.id
      WHERE r.name IN ('Supervisor', 'Super Admin', 'Administrador')
      ORDER BY r.name, u."fullName"
    `);
    
    if (supervisors.rows.length === 0) {
      console.log('   ❌ No hay supervisores configurados con emails');
    } else {
      supervisors.rows.forEach(s => {
        console.log(`   ✅ ${s.fullName} (${s.role}) - ${s.email || '❌ SIN EMAIL'}`);
      });
    }
    
    console.log('\n📋 ÚLTIMAS EVIDENCIAS CREADAS:');
    const evidences = await pool.query(`
      SELECT 
        "ticketNumber",
        "closureType",
        "clientName",
        "agentName",
        amount,
        "createdAt"
      FROM evidences 
      ORDER BY "createdAt" DESC 
      LIMIT 3
    `);
    
    if (evidences.rows.length === 0) {
      console.log('   ❌ No hay evidencias registradas');
    } else {
      evidences.rows.forEach((e, i) => {
        console.log(`\n   ${i + 1}. Ticket: ${e.ticketNumber}`);
        console.log(`      Tipo: ${e.closureType}`);
        console.log(`      Cliente: ${e.clientName}`);
        console.log(`      Asesor: ${e.agentName}`);
        console.log(`      Monto: $${e.amount}`);
        console.log(`      Fecha: ${new Date(e.createdAt).toLocaleString('es-CO')}`);
      });
    }
    
    console.log('\n\n💡 INSTRUCCIONES PARA VERIFICAR EL ENVÍO:');
    console.log('   1. Revisa los logs del backend cuando se hace un cierre');
    console.log('   2. Busca mensajes como: "✅ Email enviado a [email]"');
    console.log('   3. Verifica la bandeja de entrada de los supervisores');
    console.log('   4. Revisa también la carpeta de SPAM');
    console.log('\n   Si no ves logs de email, el servicio EmailService puede no estar inyectado correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEmailLogs();
