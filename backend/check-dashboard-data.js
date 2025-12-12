const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function checkDashboardData() {
  try {
    console.log('🔍 Verificando datos para el Dashboard Financiero...\n');
    
    // 1. Clientes con collectionStatus = 'paid'
    console.log('💰 CLIENTES CON PAGOS REALIZADOS (collectionStatus = paid):');
    const paidClients = await pool.query(`
      SELECT 
        id,
        "fullName",
        "debtAmount",
        "lastPaymentAmount",
        "lastPaymentDate",
        "collectionStatus"
      FROM clients 
      WHERE "collectionStatus" = 'paid'
      ORDER BY "lastPaymentDate" DESC
      LIMIT 5
    `);
    
    if (paidClients.rows.length === 0) {
      console.log('   ❌ No hay clientes con collectionStatus = "paid"');
    } else {
      paidClients.rows.forEach((c, i) => {
        console.log(`\n   ${i + 1}. ${c.fullName}`);
        console.log(`      Deuda original: $${c.debtAmount}`);
        console.log(`      Monto pagado: $${c.lastPaymentAmount}`);
        console.log(`      Fecha pago: ${c.lastPaymentDate}`);
        console.log(`      Estado: ${c.collectionStatus}`);
      });
    }
    
    // 2. Clientes con promesas de pago
    console.log('\n\n📅 CLIENTES CON PROMESAS DE PAGO (collectionStatus = promise):');
    const promiseClients = await pool.query(`
      SELECT 
        id,
        "fullName",
        "debtAmount",
        "promisePaymentAmount",
        "promisePaymentDate",
        "collectionStatus"
      FROM clients 
      WHERE "collectionStatus" = 'promise'
      ORDER BY "promisePaymentDate" ASC
      LIMIT 5
    `);
    
    if (promiseClients.rows.length === 0) {
      console.log('   ❌ No hay clientes con collectionStatus = "promise"');
    } else {
      promiseClients.rows.forEach((c, i) => {
        console.log(`\n   ${i + 1}. ${c.fullName}`);
        console.log(`      Deuda original: $${c.debtAmount}`);
        console.log(`      Monto prometido: $${c.promisePaymentAmount}`);
        console.log(`      Fecha promesa: ${c.promisePaymentDate}`);
        console.log(`      Estado: ${c.collectionStatus}`);
      });
    }
    
    // 3. Total de clientes
    console.log('\n\n📊 RESUMEN GENERAL:');
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_clientes,
        COUNT(*) FILTER (WHERE "collectionStatus" = 'paid') as clientes_pagaron,
        COUNT(*) FILTER (WHERE "collectionStatus" = 'promise') as clientes_promesa,
        SUM("debtAmount") as deuda_total,
        SUM(CASE WHEN "collectionStatus" = 'paid' THEN COALESCE("lastPaymentAmount", "debtAmount") ELSE 0 END) as total_recuperado,
        SUM(CASE WHEN "collectionStatus" = 'promise' THEN COALESCE("promisePaymentAmount", "debtAmount") ELSE 0 END) as total_promesas
      FROM clients
    `);
    
    const s = summary.rows[0];
    console.log(`   Total clientes: ${s.total_clientes}`);
    console.log(`   Clientes que pagaron: ${s.clientes_pagaron}`);
    console.log(`   Clientes con promesa: ${s.clientes_promesa}`);
    console.log(`   Deuda total: $${parseFloat(s.deuda_total || 0).toLocaleString()}`);
    console.log(`   Total recuperado: $${parseFloat(s.total_recuperado || 0).toLocaleString()}`);
    console.log(`   Total en promesas: $${parseFloat(s.total_promesas || 0).toLocaleString()}`);
    
    // 4. Verificar si hay chats
    console.log('\n\n💬 CHATS CREADOS:');
    const chats = await pool.query(`
      SELECT COUNT(*) as total FROM chats
    `);
    console.log(`   Total de chats: ${chats.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDashboardData();
