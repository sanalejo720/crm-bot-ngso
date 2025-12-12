const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function actualizarCampanaConNuevoFlujo() {
  const client = await pool.connect();
  
  try {
    console.log('⚙️  Actualizando campaña con el nuevo flujo...\n');

    const campaignId = 'e5af0cb8-89f4-4342-aabc-8121cb7cb3be';
    const newFlowId = '794e0e3c-c90b-49c7-91db-e25939d238ad';

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
    `, [JSON.stringify(newFlowId), campaignId]);

    if (result.rows.length > 0) {
      const campaign = result.rows[0];
      console.log('✅ Campaña actualizada:');
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Nombre: ${campaign.name}`);
      console.log(`   Bot Enabled: ${campaign.settings.botEnabled}`);
      console.log(`   Bot Flow ID: ${campaign.settings.botFlowId}`);
      
      console.log('\n✅ Configuración completada!');
      console.log('\n📝 FLUJO CONFIGURADO:');
      console.log('   1. Saludo y solicitud de tratamiento de datos');
      console.log('   2. Validación de aceptación');
      console.log('   3. Solicitud de número de documento');
      console.log('   4. Validación de documento');
      console.log('   5. Presentación de información de deuda');
      console.log('   6. Opciones: Pagar/Acordar/Hablar con asesor');
      console.log('   7. Transferencia a asesor cuando se solicite');
      
      console.log('\n🧹 Ahora limpia el chat anterior:');
      console.log('   node limpiar-prueba.js');
      
      console.log('\n📱 Luego envía un mensaje desde WhatsApp para probar el flujo completo');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

actualizarCampanaConNuevoFlujo();
