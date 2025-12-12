const { execSync } = require('child_process');

function checkBotFlow() {
  try {
    console.log('📱 NÚMEROS DE WHATSAPP:');
    const wppResult = execSync(`su - postgres -c 'psql crm_whatsapp -t -A -F"|" -c "SELECT \\"sessionName\\" || \\"||\\" || \\"phoneNumber\\" || \\"||\\" || status || \\"||\\" || COALESCE(\\"botFlowId\\"::text, \\"NULL\\") || \\"||\\" || \\"isActive\\" FROM whatsapp_numbers ORDER BY \\"createdAt\\" DESC;"'`, { encoding: 'utf-8' });
    const lines = wppResult.trim().split('\n');
    console.log('SessionName | PhoneNumber | Status | BotFlowId | Active');
    console.log('=' .repeat(80));
    lines.forEach(line => {
      if (line) {
        const parts = line.split('|');
        console.log(`${parts[0]} | ${parts[1]} | ${parts[2]} | ${parts[3]?.substring(0,8)}... | ${parts[4]}`);
      }
    });

    console.log('\n🤖 FLUJOS DE BOT:');
    const flowsResult = execSync(`su - postgres -c "psql crm_whatsapp -t -A -F'|' -c \\"SELECT id || '|' || name || '|' || COALESCE(startNodeId::text, 'NULL') || '|' || isActive FROM bot_flows ORDER BY createdAt DESC;\\""`, { encoding: 'utf-8' });
    const flowLines = flowsResult.trim().split('\n');
    
    flowLines.forEach(line => {
      if (!line) return;
      const [flowId, flowName, startNodeId, isActive] = line.split('|');
      
      console.log(`\n${flowName} (${flowId.substring(0,8)}...) - Active: ${isActive}`);
      console.log(`  StartNodeId: ${startNodeId !== 'NULL' ? startNodeId.substring(0,8) + '...' : 'NULL'}`);
      
      console.log('  Nodos:');
      const nodesResult = execSync(`su - postgres -c "psql crm_whatsapp -t -A -F'|' -c \\"SELECT id || '|' || type || '|' || name FROM bot_nodes WHERE flowId = '${flowId}' ORDER BY createdAt;\\""`, { encoding: 'utf-8' });
      
      if (!nodesResult.trim()) {
        console.log('    ⚠️ No hay nodos en este flujo');
      } else {
        const nodeLines = nodesResult.trim().split('\n');
        nodeLines.forEach(nodeLine => {
          const [nodeId, nodeType, nodeName] = nodeLine.split('|');
          const isStart = nodeId === startNodeId ? ' ⭐ START' : '';
          console.log(`    - ${nodeName} (${nodeType}) [${nodeId.substring(0,8)}...]${isStart}`);
        });
      }
      
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
    });

    console.log('\n💬 CHATS RECIENTES:');
    const chatsResult = execSync(`su - postgres -c "psql crm_whatsapp -t -A -F'|' -c \\"SELECT id || '|' || COALESCE(contactName, 'Sin nombre') || '|' || contactPhone || '|' || status || '|' || is_bot_active FROM chats ORDER BY createdAt DESC LIMIT 10;\\""`, { encoding: 'utf-8' });
    
    if (!chatsResult.trim()) {
      console.log('  No hay chats');
    } else {
      const chatLines = chatsResult.trim().split('\n');
      console.log('ChatId | Name | Phone | Status | BotActive');
      console.log('=' .repeat(80));
      chatLines.forEach(line => {
        const [chatId, name, phone, status, botActive] = line.split('|');
        console.log(`${chatId.substring(0,8)}... | ${name} | ${phone} | ${status} | ${botActive}`);
      });
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stderr) console.error(error.stderr.toString());
    if (error.stdout) console.error(error.stdout.toString());
  }
}

checkBotFlow();
