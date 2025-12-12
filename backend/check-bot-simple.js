const { execSync } = require('child_process');
const fs = require('fs');

function checkBotFlow() {
  try {
    // Crear archivos SQL temporales
    const sql1 = `SELECT "sessionName", "phoneNumber", status, "botFlowId", "isActive" FROM whatsapp_numbers ORDER BY "createdAt" DESC;`;
    const sql2 = `SELECT id, name, "startNodeId", "isActive" FROM bot_flows ORDER BY "createdAt" DESC;`;
    const sql3 = `SELECT id, "contactName", "contactPhone", status, is_bot_active FROM chats ORDER BY "createdAt" DESC LIMIT 10;`;
    
    fs.writeFileSync('/tmp/q1.sql', sql1);
    fs.writeFileSync('/tmp/q2.sql', sql2);
    fs.writeFileSync('/tmp/q3.sql', sql3);
    
    console.log('📱 NÚMEROS DE WHATSAPP:');
    console.log('=' .repeat(100));
    const wpp = execSync(`su - postgres -c "psql crm_whatsapp -f /tmp/q1.sql"`, { encoding: 'utf-8' });
    console.log(wpp);
    
    console.log('\n🤖 FLUJOS DE BOT:');
    console.log('=' .repeat(100));
    const flows = execSync(`su - postgres -c "psql crm_whatsapp -f /tmp/q2.sql"`, { encoding: 'utf-8' });
    console.log(flows);
    
    // Parse flows para verificar nodos
    const flowIdMatch = flows.match(/([a-f0-9-]{36})/);
    if (flowIdMatch) {
      const flowId = flowIdMatch[1];
      const sql4 = `SELECT id, type, name FROM bot_nodes WHERE "flowId" = '${flowId}' ORDER BY "createdAt";`;
      fs.writeFileSync('/tmp/q4.sql', sql4);
      
      console.log('\n📋 NODOS DEL PRIMER FLUJO:');
      console.log('=' .repeat(100));
      const nodes = execSync(`su - postgres -c "psql crm_whatsapp -f /tmp/q4.sql"`, { encoding: 'utf-8' });
      console.log(nodes);
    }
    
    console.log('\n💬 CHATS RECIENTES:');
    console.log('=' .repeat(100));
    const chats = execSync(`su - postgres -c "psql crm_whatsapp -f /tmp/q3.sql"`, { encoding: 'utf-8' });
    console.log(chats);
    
    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stdout) console.error(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
  }
}

checkBotFlow();
