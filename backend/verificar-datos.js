const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function verificarDatos() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando datos del número 573334309474...\n');

    // 1. Verificar deudor
    const debtor = await client.query(`
      SELECT id, "fullName", phone, "debtAmount", "daysOverdue", status, metadata
      FROM debtors 
      WHERE phone = '573334309474'
    `);
    
    console.log('📋 DEUDOR:');
    if (debtor.rows.length > 0) {
      const d = debtor.rows[0];
      console.log(`   ID: ${d.id}`);
      console.log(`   Nombre: ${d.fullName}`);
      console.log(`   Teléfono: ${d.phone}`);
      console.log(`   Deuda: $${d.debtAmount}`);
      console.log(`   Días mora: ${d.daysOverdue}`);
      console.log(`   Estado: ${d.status}`);
      console.log(`   Metadata: ${JSON.stringify(d.metadata)}`);
    } else {
      console.log('   ❌ No se encontró el deudor');
    }

    // 2. Verificar chats
    const chats = await client.query(`
      SELECT id, "contactPhone", "contactName", "clientId", status, "campaignId"
      FROM chats 
      WHERE "contactPhone" LIKE '573334309474%'
    `);
    
    console.log('\n💬 CHATS:');
    if (chats.rows.length > 0) {
      chats.rows.forEach((chat, i) => {
        console.log(`   Chat ${i + 1}:`);
        console.log(`     ID: ${chat.id}`);
        console.log(`     Teléfono: ${chat.contactPhone}`);
        console.log(`     Nombre: ${chat.contactName}`);
        console.log(`     ClientId: ${chat.clientId || 'NULL ❌'}`);
        console.log(`     Estado: ${chat.status}`);
        console.log(`     CampaignId: ${chat.campaignId}`);
      });
    } else {
      console.log('   ℹ️ No hay chats');
    }

    // 3. Verificar clientes
    const clients = await client.query(`
      SELECT id, "fullName", phone, email, company, tags, metadata
      FROM clients 
      WHERE phone = '573334309474'
    `);
    
    console.log('\n👤 CLIENTES:');
    if (clients.rows.length > 0) {
      clients.rows.forEach((cl, i) => {
        console.log(`   Cliente ${i + 1}:`);
        console.log(`     ID: ${cl.id}`);
        console.log(`     Nombre: ${cl.fullName}`);
        console.log(`     Teléfono: ${cl.phone}`);
        console.log(`     Email: ${cl.email || 'NULL'}`);
        console.log(`     Empresa: ${cl.company || 'NULL'}`);
        console.log(`     Tags: ${cl.tags || 'NULL'}`);
        console.log(`     Metadata: ${JSON.stringify(cl.metadata)}`);
      });
    } else {
      console.log('   ℹ️ No hay clientes');
    }

    // 4. Verificar mensajes
    const messages = await client.query(`
      SELECT m.id, m."chatId", m.content, m.direction, m."createdAt"
      FROM messages m
      JOIN chats c ON c.id = m."chatId"
      WHERE c."contactPhone" LIKE '573334309474%'
      ORDER BY m."createdAt" DESC
      LIMIT 5
    `);
    
    console.log('\n📨 MENSAJES (últimos 5):');
    if (messages.rows.length > 0) {
      messages.rows.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.direction}: "${msg.content.substring(0, 50)}..."`);
      });
    } else {
      console.log('   ℹ️ No hay mensajes');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verificarDatos();
