const { execSync } = require('child_process');

function checkBotFlow() {
  // Usar psql como postgres user directamente
  try {
    console.log('📱 NÚMEROS DE WHATSAPP:');
    const wppResult = execSync(`su - postgres -c "psql crm_whatsapp -t -A -F'|' -c \\"SELECT sessionName || '|' || phoneNumber || '|' || status || '|' || COALESCE(botFlowId::text, 'NULL') FROM whatsapp_numbers ORDER BY createdAt DESC;\\""`, { encoding: 'utf-8' });
    console.log(wppResult);

    console.log('\n🤖 FLUJOS DE BOT:');
    const flowsResult = execSync(`su - postgres -c "psql crm_whatsapp -t -A -c \\"SELECT id, name, startNodeId, isActive FROM bot_flows ORDER BY createdAt DESC;\\""`, { encoding: 'utf-8' });
    console.log(flowsResult);
    
    // Obtener el primer flow ID
    const flowLines = flowsResult.trim().split('\n');
    for (const line of flowLines) {
      if (!line) continue;
      const [flowId, flowName, startNodeId] = line.split('|');
      
      console.log(`\n📋 NODOS DEL FLUJO "${flowName}" (${flowId}):`);
      const nodesResult = execSync(`su - postgres -c "psql crm_whatsapp -t -A -c \\"SELECT id, type, name FROM bot_nodes WHERE flowId = '${flowId}' ORDER BY createdAt;\\""`, { encoding: 'utf-8' });
      console.log(nodesResult || '  ⚠️ No hay nodos en este flujo');
      
      if (startNodeId && startNodeId !== 'NULL') {
        const nodeCheck = execSync(`su - postgres -c "psql crm_whatsapp -t -A -c \\"SELECT COUNT(*) FROM bot_nodes WHERE id = '${startNodeId}';\\""`, { encoding: 'utf-8' }).trim();
        if (nodeCheck === '1') {
          console.log(`  ✅ Nodo inicial existe`);
        } else {
          console.log(`  ❌ PROBLEMA: Nodo inicial ${startNodeId} NO EXISTE`);
        }
      } else {
        console.log(`  ⚠️ PROBLEMA: Flujo sin nodo inicial definido`);
      }
    }

    console.log('\n💬 CHATS CON BOT ACTIVO:');
    const chatsResult = execSync(`su - postgres -c "psql crm_whatsapp -t -A -c \\"SELECT id, contactName, contactPhone, status, is_bot_active FROM chats WHERE is_bot_active = true ORDER BY createdAt DESC LIMIT 5;\\""`, { encoding: 'utf-8' });
    console.log(chatsResult || '  No hay chats con bot activo');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stderr) console.error(error.stderr.toString());
  }
}

checkBotFlow();

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // 1. Ver números de WhatsApp y sus flujos
    console.log('📱 NÚMEROS DE WHATSAPP:');
    const wppResult = await client.query(`
      SELECT 
        "sessionName", 
        "phoneNumber", 
        status, 
        "botFlowId",
        "isActive"
      FROM whatsapp_numbers
      ORDER BY "createdAt" DESC;
    `);
    console.table(wppResult.rows);

    // 2. Ver flujos de bot
    console.log('\n🤖 FLUJOS DE BOT:');
    const flowsResult = await client.query(`
      SELECT 
        id,
        name,
        "startNodeId",
        "isActive",
        "createdAt"
      FROM bot_flows
      ORDER BY "createdAt" DESC;
    `);
    console.table(flowsResult.rows);

    // 3. Ver nodos de cada flujo
    for (const flow of flowsResult.rows) {
      console.log(`\n📋 NODOS DEL FLUJO "${flow.name}" (${flow.id}):`);
      const nodesResult = await client.query(`
        SELECT 
          id,
          type,
          name,
          config
        FROM bot_nodes
        WHERE "flowId" = $1
        ORDER BY "createdAt";
      `, [flow.id]);
      
      if (nodesResult.rows.length === 0) {
        console.log('  ⚠️ No hay nodos en este flujo');
      } else {
        console.table(nodesResult.rows.map(n => ({
          id: n.id.substring(0, 8) + '...',
          type: n.type,
          name: n.name,
          hasConfig: !!n.config
        })));
      }

      // Verificar si startNodeId existe
      if (flow.startNodeId) {
        const startNodeExists = nodesResult.rows.find(n => n.id === flow.startNodeId);
        if (startNodeExists) {
          console.log(`  ✅ Nodo inicial existe: ${startNodeExists.name}`);
        } else {
          console.log(`  ❌ PROBLEMA: Nodo inicial ${flow.startNodeId} NO EXISTE`);
        }
      } else {
        console.log(`  ⚠️ PROBLEMA: Flujo sin nodo inicial definido`);
      }
    }

    // 4. Ver chats con bot activo
    console.log('\n💬 CHATS CON BOT ACTIVO:');
    const chatsResult = await client.query(`
      SELECT 
        id,
        "contactName",
        "contactPhone",
        status,
        "is_bot_active",
        "botContext"
      FROM chats
      WHERE "is_bot_active" = true
      ORDER BY "createdAt" DESC
      LIMIT 5;
    `);
    
    if (chatsResult.rows.length === 0) {
      console.log('  No hay chats con bot activo');
    } else {
      console.table(chatsResult.rows.map(c => ({
        id: c.id.substring(0, 8) + '...',
        contactName: c.contactName,
        contactPhone: c.contactPhone,
        status: c.status,
        botActive: c.is_bot_active,
        flowId: c.botContext?.flowId?.substring(0, 8) + '...' || 'N/A',
        currentNode: c.botContext?.currentNodeId?.substring(0, 8) + '...' || 'N/A'
      })));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

checkBotFlow();
