const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'crm_user',
  password: 'crm_secure_2024',
});

async function checkWhatsAppNumbers() {
  try {
    console.log('\n🔍 Verificando números de WhatsApp con botFlowId...\n');

    const result = await pool.query(`
      SELECT 
        wn.id,
        wn."phoneNumber",
        wn."displayName",
        wn."botFlowId",
        bf.name as bot_flow_name,
        wn."campaignId",
        c.name as campaign_name
      FROM whatsapp_numbers wn
      LEFT JOIN bot_flows bf ON bf.id = wn."botFlowId"
      LEFT JOIN campaigns c ON c.id = wn."campaignId"
      ORDER BY wn."createdAt" DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ No hay números de WhatsApp configurados');
      return;
    }

    result.rows.forEach((row, index) => {
      console.log(`\n📱 Número ${index + 1}:`);
      console.log(`   Teléfono: ${row.phoneNumber}`);
      console.log(`   Nombre: ${row.displayName}`);
      console.log(`   Bot Flow ID: ${row.botFlowId || '❌ NO ASIGNADO'}`);
      console.log(`   Bot Flow Name: ${row.bot_flow_name || '❌ Sin flujo'}`);
      console.log(`   Campaña: ${row.campaign_name || 'Sin campaña'}`);
      console.log(`   ---`);
    });

    console.log('\n✅ Verificación completada\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkWhatsAppNumbers();
