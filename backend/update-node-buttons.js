/**
 * Script para actualizar nodo de bot con botones interactivos
 * Ejecutar: node update-node-buttons.js
 */

const { Client } = require('pg');

const client = new Client({
  host: '72.61.73.9',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!',
});

async function updateNodeWithButtons() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // 1. Obtener el nodo "Saludo y Tratamiento de Datos"
    const nodeResult = await client.query(`
      SELECT id, name, type, config 
      FROM bot_nodes 
      WHERE name LIKE '%Saludo y Tratamiento%'
         OR name LIKE '%Tratamiento de Datos%'
         OR (config->>'message' LIKE '%autoriza%' AND config->>'message' LIKE '%Sí%')
    `);

    if (nodeResult.rows.length === 0) {
      console.log('❌ No se encontró el nodo');
      
      // Mostrar todos los nodos para debug
      const allNodes = await client.query(`
        SELECT id, name, type, LEFT(config->>'message', 100) as msg_preview
        FROM bot_nodes
        ORDER BY name
      `);
      console.log('\n📋 Nodos disponibles:');
      allNodes.rows.forEach(n => {
        console.log(`  - ${n.name} (${n.type}): ${n.msg_preview || 'sin mensaje'}`);
      });
      return;
    }

    console.log(`\n📋 Nodos encontrados: ${nodeResult.rows.length}`);
    
    for (const node of nodeResult.rows) {
      console.log(`\n🔧 Procesando nodo: ${node.name} (ID: ${node.id})`);
      console.log(`   Tipo: ${node.type}`);
      console.log(`   Config actual:`, JSON.stringify(node.config, null, 2));

      // Actualizar la configuración del nodo para usar botones
      const newConfig = {
        ...node.config,
        useButtons: true,
        buttonTitle: 'Autorización',
        buttons: [
          { id: 'si', text: 'Sí, acepto', value: 'si' },
          { id: 'no', text: 'No acepto', value: 'no' }
        ]
      };

      await client.query(`
        UPDATE bot_nodes 
        SET config = $1
        WHERE id = $2
      `, [JSON.stringify(newConfig), node.id]);

      console.log(`✅ Nodo actualizado con botones interactivos`);
      console.log(`   Nueva config:`, JSON.stringify(newConfig, null, 2));
    }

    // 2. También actualizar el nodo de CONDITION para que maneje los IDs de botones
    const conditionNodes = await client.query(`
      SELECT id, name, type, config 
      FROM bot_nodes 
      WHERE type = 'condition'
        AND (config->>'variable' = 'aceptacion' OR config->'conditions' @> '[{"variable": "aceptacion"}]')
    `);

    console.log(`\n📋 Nodos de condición encontrados: ${conditionNodes.rows.length}`);
    
    for (const node of conditionNodes.rows) {
      console.log(`\n🔧 Actualizando condición: ${node.name}`);
      
      // Actualizar condiciones para aceptar tanto 'si' como 'sí'
      const newConfig = {
        ...node.config,
        conditions: [
          {
            variable: 'user_response',
            operator: 'contains_ignore_case',
            value: 'si',
            nextNodeId: node.config.conditions?.[0]?.nextNodeId || node.config.targetNodeId
          }
        ],
        elseNodeId: node.config.defaultNodeId || node.config.elseNodeId
      };

      await client.query(`
        UPDATE bot_nodes 
        SET config = $1
        WHERE id = $2
      `, [JSON.stringify(newConfig), node.id]);

      console.log(`✅ Condición actualizada`);
    }

    console.log('\n✅ Actualización completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

updateNodeWithButtons();
