const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function checkEstado() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estado del chat...\n');

    // Obtener el chat
    const chatResult = await client.query(`
      SELECT id, status, "botContext", "assignedAgentId", "contactPhone"
      FROM chats 
      WHERE "contactPhone" LIKE '573334309474%'
    `);

    if (chatResult.rows.length === 0) {
      console.log('❌ No se encontró el chat');
      return;
    }

    const chat = chatResult.rows[0];
    console.log('📱 CHAT:');
    console.log(`   ID: ${chat.id}`);
    console.log(`   Teléfono: ${chat.contactPhone}`);
    console.log(`   Estado: ${chat.status}`);
    console.log(`   Agente asignado: ${chat.assignedAgentId || 'NINGUNO'}`);
    console.log(`   Bot Context:`, chat.botContext);

    // Obtener mensajes recientes
    const messagesResult = await client.query(`
      SELECT id, content, direction, "senderType", "createdAt"
      FROM messages 
      WHERE "chatId" = $1 
      ORDER BY "createdAt" DESC 
      LIMIT 10
    `, [chat.id]);

    console.log('\n📨 ÚLTIMOS MENSAJES:');
    messagesResult.rows.reverse().forEach((msg, i) => {
      const time = new Date(msg.createdAt).toLocaleTimeString('es-CO');
      console.log(`   ${i + 1}. [${time}] ${msg.direction} - ${msg.senderType}:`);
      console.log(`      "${msg.content.substring(0, 80)}${msg.content.length > 80 ? '...' : ''}"`);
    });

    // Verificar el flujo
    const flowResult = await client.query(`
      SELECT bf.id, bf.name, bf."startNodeId"
      FROM bot_flows bf
      WHERE bf.id = $1
    `, [chat.botContext?.flowId]);

    if (flowResult.rows.length > 0) {
      console.log('\n🤖 FLUJO BOT:');
      console.log(`   Nombre: ${flowResult.rows[0].name}`);
      console.log(`   Start Node: ${flowResult.rows[0].startNodeId}`);
      console.log(`   Current Node: ${chat.botContext?.currentNodeId || 'NINGUNO'}`);

      // Obtener info del nodo actual
      if (chat.botContext?.currentNodeId) {
        const nodeResult = await client.query(`
          SELECT id, name, type, config, "nextNodeId"
          FROM bot_nodes
          WHERE id = $1
        `, [chat.botContext.currentNodeId]);

        if (nodeResult.rows.length > 0) {
          const node = nodeResult.rows[0];
          console.log('\n📍 NODO ACTUAL:');
          console.log(`   Nombre: ${node.name}`);
          console.log(`   Tipo: ${node.type}`);
          console.log(`   Next Node ID: ${node.nextNodeId || 'NINGUNO'}`);
          console.log(`   Config:`, node.config);
        }
      }
    }

    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkEstado();
