const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function configurarBotEnCampana() {
  const client = await pool.connect();
  
  try {
    console.log('⚙️  Configurando bot en la campaña...\n');

    const campaignId = 'e5af0cb8-89f4-4342-aabc-8121cb7cb3be';
    const botFlowId = 'fd99cbfd-4b1d-4ded-a0f1-5af510024d9d'; // Flujo activo con 5 nodos

    // Actualizar settings de la campaña
    const result = await client.query(`
      UPDATE campaigns
      SET settings = jsonb_set(
        jsonb_set(
          COALESCE(settings, '{}'::jsonb),
          '{botEnabled}',
          'true'::jsonb
        ),
        '{botFlowId}',
        $1::jsonb
      ),
      "updatedAt" = NOW()
      WHERE id = $2
      RETURNING id, name, settings
    `, [JSON.stringify(botFlowId), campaignId]);

    if (result.rows.length > 0) {
      const campaign = result.rows[0];
      console.log('✅ Campaña actualizada:');
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Nombre: ${campaign.name}`);
      console.log(`   Bot Enabled: ${campaign.settings.botEnabled}`);
      console.log(`   Bot Flow ID: ${campaign.settings.botFlowId}`);
      console.log('\n✅ Configuración completada!');
      console.log('\n📝 Siguiente paso:');
      console.log('   1. Envía un mensaje desde WhatsApp al número 573334309474');
      console.log('   2. El bot debería responder automáticamente');
      console.log('   3. Verifica los logs del backend');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

configurarBotEnCampana();
