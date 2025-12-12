const { DataSource } = require('typeorm');

async function checkBotFlow() {
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

    // 1. Verificar el flujo
    console.log('📋 INFORMACIÓN DEL FLUJO:');
    console.log('='.repeat(80));
    const flow = await dataSource.query(`
      SELECT 
        id,
        name,
        "startNodeId",
        status,
        "createdAt"
      FROM bot_flows
      WHERE id = $1
    `, [flowId]);

    if (flow.length === 0) {
      console.log('❌ Flujo no encontrado');
      return;
    }

    console.log('ID:', flow[0].id);
    console.log('Nombre:', flow[0].name);
    console.log('Start Node ID:', flow[0].startNodeId);
    console.log('Status:', flow[0].status);
    console.log('');

    // 2. Contar nodos
    const nodeCount = await dataSource.query(`
      SELECT COUNT(*) as total
      FROM bot_nodes
      WHERE "flowId" = $1
    `, [flowId]);

    console.log(`📊 Total de nodos: ${nodeCount[0].total}\n`);

    // 3. Verificar si el startNodeId existe
    if (flow[0].startNodeId) {
      const startNode = await dataSource.query(`
        SELECT id, name, type
        FROM bot_nodes
        WHERE id = $1
      `, [flow[0].startNodeId]);

      if (startNode.length > 0) {
        console.log('✅ Nodo inicial ENCONTRADO:');
        console.log('   ID:', startNode[0].id);
        console.log('   Nombre:', startNode[0].name);
        console.log('   Tipo:', startNode[0].type);
      } else {
        console.log('❌ Nodo inicial NO EXISTE en la base de datos');
        console.log('   Start Node ID configurado:', flow[0].startNodeId);
      }
    } else {
      console.log('⚠️  El flujo NO tiene startNodeId configurado');
    }

    console.log('\n');

    // 4. Listar todos los nodos del flujo
    console.log('📝 TODOS LOS NODOS DEL FLUJO:');
    console.log('='.repeat(80));
    const nodes = await dataSource.query(`
      SELECT 
        id,
        name,
        type,
        "nextNodeId",
        "positionX",
        "positionY"
      FROM bot_nodes
      WHERE "flowId" = $1
      ORDER BY "positionY", "positionX"
    `, [flowId]);

    if (nodes.length === 0) {
      console.log('❌ No hay nodos en este flujo');
    } else {
      nodes.forEach((node, index) => {
        console.log(`\n${index + 1}. ${node.name}`);
        console.log(`   ID: ${node.id}`);
        console.log(`   Tipo: ${node.type}`);
        console.log(`   Next Node: ${node.nextNodeId || 'ninguno'}`);
        console.log(`   Posición: (${node.positionX}, ${node.positionY})`);
      });
    }

    // 5. Sugerir solución
    console.log('\n\n');
    console.log('💡 SOLUCIÓN SUGERIDA:');
    console.log('='.repeat(80));
    
    if (nodes.length > 0) {
      const firstNode = nodes[0];
      console.log(`Actualizar el flujo para usar el primer nodo como inicio:`);
      console.log(`\nUPDATE bot_flows`);
      console.log(`SET "startNodeId" = '${firstNode.id}'`);
      console.log(`WHERE id = '${flowId}';`);
      console.log(`\n¿Quieres que ejecute esta actualización? (responde 'si' o 'no')`);
    }

    await dataSource.destroy();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBotFlow();
