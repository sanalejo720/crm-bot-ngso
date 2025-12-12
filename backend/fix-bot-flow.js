const { DataSource } = require('typeorm');

async function fixBotFlow() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    database: 'crm_whatsapp',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Conectado a la base de datos\n');

    const flowId = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';
    const newStartNodeId = '3ff43437-a8a4-4a7c-9c9d-d1c937f914fe';

    console.log('🔧 Actualizando flujo...');
    console.log(`   Flujo: ${flowId}`);
    console.log(`   Nuevo nodo inicial: ${newStartNodeId} (Saludo y Tratamiento de Datos)\n`);

    await dataSource.query(`
      UPDATE bot_flows
      SET "startNodeId" = $1
      WHERE id = $2
    `, [newStartNodeId, flowId]);

    console.log('✅ Flujo actualizado exitosamente!\n');

    // Verificar
    const flow = await dataSource.query(`
      SELECT name, "startNodeId"
      FROM bot_flows
      WHERE id = $1
    `, [flowId]);

    console.log('📋 Verificación:');
    console.log(`   Flujo: ${flow[0].name}`);
    console.log(`   Start Node ID: ${flow[0].startNodeId}`);

    await dataSource.destroy();
    console.log('\n✅ Proceso completado!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixBotFlow();
