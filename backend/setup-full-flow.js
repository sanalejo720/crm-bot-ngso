const { Client } = require('pg');

async function setupFullFlow() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    database: 'crm_whatsapp'
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    const flowId = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

    // Get all nodes
    const result = await client.query(`
      SELECT 
        id,
        name,
        type,
        config
      FROM bot_nodes
      WHERE "flowId" = $1
      ORDER BY "positionY", "positionX"
    `, [flowId]);

    const nodes = {};
    result.rows.forEach(node => {
      nodes[node.name] = node;
    });

    console.log('📊 Configurando flujo completo...\n');

    // 1. Saludo → Validar Aceptación (ya configurado)
    
    // 2. Validar Aceptación (CONDITION): 
    //    - Si acepta (1, "acepto", "si") → Solicitar Documento
    //    - Si rechaza (else) → Rechazo de Tratamiento
    const validarAceptacion = nodes['Validar Aceptación'];
    const config = validarAceptacion.config;
    
    if (config.conditions) {
      config.conditions.forEach(cond => {
        cond.nextNodeId = nodes['Solicitar Documento'].id;
      });
    }
    config.elseNodeId = nodes['Rechazo de Tratamiento'].id;

    await client.query(`
      UPDATE bot_nodes
      SET config = $1
      WHERE id = $2
    `, [JSON.stringify(config), validarAceptacion.id]);
    console.log('✅ Validar Aceptación configurado');

    // 3. Solicitar Documento → Capturar Documento
    await client.query(`
      UPDATE bot_nodes
      SET "nextNodeId" = $1
      WHERE id = $2
    `, [nodes['Capturar Documento'].id, nodes['Solicitar Documento'].id]);
    console.log('✅ Solicitar Documento → Capturar Documento');

    // 4. Capturar Documento → Presentación de Deuda
    await client.query(`
      UPDATE bot_nodes
      SET "nextNodeId" = $1
      WHERE id = $2
    `, [nodes['Presentación de Deuda'].id, nodes['Capturar Documento'].id]);
    console.log('✅ Capturar Documento → Presentación de Deuda');

    // 5. Presentación de Deuda → Evaluar Opción
    await client.query(`
      UPDATE bot_nodes
      SET "nextNodeId" = $1
      WHERE id = $2
    `, [nodes['Evaluar Opción'].id, nodes['Presentación de Deuda'].id]);
    console.log('✅ Presentación de Deuda → Evaluar Opción');

    // 6. Evaluar Opción (CONDITION):
    //    - Si quiere hablar con asesor ("1", "asesor", "hablar") → Transferir a Asesor
    //    - else → END (ninguno)
    const evaluarOpcion = nodes['Evaluar Opción'];
    const evalConfig = evaluarOpcion.config;
    
    if (evalConfig.conditions) {
      evalConfig.conditions.forEach(cond => {
        cond.nextNodeId = nodes['Transferir a Asesor'].id;
      });
    }
    evalConfig.elseNodeId = null; // Termina el bot

    await client.query(`
      UPDATE bot_nodes
      SET config = $1
      WHERE id = $2
    `, [JSON.stringify(evalConfig), evaluarOpcion.id]);
    console.log('✅ Evaluar Opción configurado');

    // Verificar flujo completo
    console.log('\n📋 Flujo completo:');
    const finalResult = await client.query(`
      SELECT 
        id,
        name,
        type,
        "nextNodeId",
        config
      FROM bot_nodes
      WHERE "flowId" = $1
      ORDER BY "positionY", "positionX"
    `, [flowId]);

    finalResult.rows.forEach((node, index) => {
      const nextNode = finalResult.rows.find(n => n.id === node.nextNodeId);
      console.log(`${index + 1}. [${node.type}] ${node.name}`);
      
      if (nextNode) {
        console.log(`   nextNodeId → ${nextNode.name}`);
      }
      
      if (node.type === 'condition' && node.config.conditions) {
        node.config.conditions.forEach((cond, i) => {
          const condNext = finalResult.rows.find(n => n.id === cond.nextNodeId);
          if (condNext) {
            console.log(`   condition[${i}] → ${condNext.name}`);
          }
        });
        if (node.config.elseNodeId) {
          const elseNode = finalResult.rows.find(n => n.id === node.config.elseNodeId);
          if (elseNode) {
            console.log(`   else → ${elseNode.name}`);
          }
        }
      }
      console.log('');
    });

    await client.end();
    console.log('✅ Flujo completo configurado!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupFullFlow();
