const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function verificarConfiguracionBot() {
  const client = await pool.connect();
  
  try {
    console.log('🤖 Verificando configuración del bot...\n');

    // 1. Verificar flujos del bot
    const flows = await client.query(`
      SELECT id, name, status, description, "startNodeId"
      FROM bot_flows 
      ORDER BY "createdAt" DESC
    `);
    
    console.log('📋 FLUJOS DEL BOT:');
    if (flows.rows.length > 0) {
      flows.rows.forEach((flow, i) => {
        console.log(`   ${i + 1}. ${flow.name}`);
        console.log(`      ID: ${flow.id}`);
        console.log(`      Estado: ${flow.status}`);
        console.log(`      Start Node: ${flow.startNodeId || '❌ NULL'}`);
        console.log(`      Descripción: ${flow.description || 'N/A'}`);
        console.log('');
      });
      
      // Contar nodos de cada flujo
      for (const flow of flows.rows) {
        const nodesCount = await client.query(`
          SELECT COUNT(*) as count FROM bot_nodes WHERE "flowId" = $1
        `, [flow.id]);
        console.log(`      Nodos: ${nodesCount.rows[0].count}`);
      }
    } else {
      console.log('   ❌ No hay flujos configurados');
    }

    // 2. Verificar campaña del chat
    const campaign = await client.query(`
      SELECT c.id, c.name, c.status, c.settings
      FROM campaigns c
      WHERE c.id = (
        SELECT "campaignId" FROM chats WHERE "contactPhone" = '573334309474@c.us' LIMIT 1
      )
    `);
    
    console.log('\n🎯 CAMPAÑA DEL CHAT:');
    if (campaign.rows.length > 0) {
      const camp = campaign.rows[0];
      const botEnabled = camp.settings?.botEnabled;
      const botFlowId = camp.settings?.botFlowId;
      
      console.log(`   Nombre: ${camp.name}`);
      console.log(`   ID: ${camp.id}`);
      console.log(`   Estado: ${camp.status}`);
      console.log(`   Bot Enabled: ${botEnabled !== undefined ? botEnabled : '❌ No configurado'}`);
      console.log(`   Bot Flow ID: ${botFlowId || '❌ NULL - No hay flujo asignado'}`);
      
      if (!botEnabled) {
        console.log('\n⚠️  PROBLEMA 1: El bot NO está habilitado en la campaña');
        console.log('   Solución: Habilitar bot en settings.botEnabled = true');
      }
      
      if (!botFlowId) {
        console.log('\n⚠️  PROBLEMA 2: La campaña no tiene un flujo de bot asignado');
        console.log('   Solución: Asignar un flujo activo en settings.botFlowId');
      }
    } else {
      console.log('   ❌ No se encontró la campaña');
    }

    // 3. Verificar estado del chat
    const chat = await client.query(`
      SELECT id, status, "assignedAgentId", "botActive", "lastMessageAt"
      FROM chats 
      WHERE "contactPhone" = '573334309474@c.us'
    `);
    
    console.log('\n💬 ESTADO DEL CHAT:');
    if (chat.rows.length > 0) {
      const ch = chat.rows[0];
      console.log(`   ID: ${ch.id}`);
      console.log(`   Estado: ${ch.status}`);
      console.log(`   Agente asignado: ${ch.assignedAgentId || 'No asignado'}`);
      console.log(`   Bot activo: ${ch.botActive !== undefined ? ch.botActive : '❌ Campo no existe'}`);
      console.log(`   Último mensaje: ${ch.lastMessageAt}`);
    } else {
      console.log('   ❌ Chat no encontrado');
    }

    // 4. Verificar listeners del bot
    const listeners = await client.query(`
      SELECT "entityName", "propertyName", "eventName"
      FROM bot_flows
      LIMIT 1
    `);
    
    console.log('\n🎧 CONFIGURACIÓN DE EVENTOS:');
    console.log('   Verificar que el bot esté escuchando eventos de mensajes...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verificarConfiguracionBot();
