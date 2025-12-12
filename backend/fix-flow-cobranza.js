// Script para corregir el flujo de cobranza
const { Client } = require('pg');

async function fixFlow() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'crm_whatsapp',
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!'
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');
    
    const flowId = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';
    
    // Obtener el primer nodo (Saludo y Tratamiento de Datos)
    const firstNode = await client.query(`
      SELECT id, name FROM bot_nodes
      WHERE "flowId" = $1 AND name = 'Saludo y Tratamiento de Datos'
    `, [flowId]);
    
    if (firstNode.rows.length > 0) {
      const startNodeId = firstNode.rows[0].id;
      console.log(`\n🔧 Actualizando startNodeId a: ${startNodeId}`);
      console.log(`   Nodo: ${firstNode.rows[0].name}`);
      
      await client.query(`
        UPDATE bot_flows
        SET "startNodeId" = $1, "updatedAt" = NOW()
        WHERE id = $2
      `, [startNodeId, flowId]);
      
      console.log('✅ Flujo actualizado correctamente');
    } else {
      console.log('❌ No se encontró el nodo inicial');
    }
    
    // Verificar la estructura completa
    console.log('\n📋 VERIFICANDO ESTRUCTURA DEL FLUJO:\n');
    
    const nodes = await client.query(`
      SELECT id, name, type, "nextNodeId", config
      FROM bot_nodes
      WHERE "flowId" = $1
      ORDER BY "positionX", "positionY"
    `, [flowId]);
    
    nodes.rows.forEach((node, idx) => {
      console.log(`${idx + 1}. ${node.name} (${node.type})`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Next: ${node.nextNodeId || 'ninguno'}`);
      
      if (node.config.variableName) {
        console.log(`   ✅ Variable: ${node.config.variableName}`);
      }
      if (node.type === 'condition' && node.config.conditions) {
        console.log(`   ✅ Condiciones: ${node.config.conditions.length}`);
      }
      console.log('');
    });
    
    // Verificar nodos referenciales
    console.log('\n🔍 VERIFICANDO REFERENCIAS:\n');
    
    for (const node of nodes.rows) {
      if (node.nextNodeId) {
        const nextExists = nodes.rows.find(n => n.id === node.nextNodeId);
        if (!nextExists) {
          console.log(`⚠️  ${node.name} → nextNodeId ${node.nextNodeId} NO EXISTE`);
        } else {
          console.log(`✅ ${node.name} → ${nextExists.name}`);
        }
      }
      
      // Verificar condiciones
      if (node.type === 'condition' && node.config.conditions) {
        for (const cond of node.config.conditions) {
          const condNextExists = nodes.rows.find(n => n.id === cond.nextNodeId);
          if (!condNextExists) {
            console.log(`⚠️  ${node.name} [condición] → ${cond.nextNodeId} NO EXISTE`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixFlow();
