const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function verificarCondiciones() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando nodo de condición...\n');

    const nodeId = '18c35e6a-ce48-463e-9921-0051572ae699'; // Nodo de Validación

    const result = await client.query(`
      SELECT id, name, type, config
      FROM bot_nodes
      WHERE id = $1
    `, [nodeId]);

    if (result.rows.length === 0) {
      console.log('❌ Nodo no encontrado');
      return;
    }

    const node = result.rows[0];
    console.log('📋 NODO:', node.name);
    console.log('   Tipo:', node.type);
    console.log('\n📝 CONFIG COMPLETO:');
    console.log(JSON.stringify(node.config, null, 2));

    console.log('\n🔍 CONDICIONES:');
    if (node.config.conditions) {
      node.config.conditions.forEach((cond, i) => {
        console.log(`\n   Condición ${i + 1}:`);
        console.log(`   - variable: "${cond.variable}"`);
        console.log(`   - operator: "${cond.operator}"`);
        console.log(`   - value: "${cond.value}"`);
        console.log(`   - nextNodeId: "${cond.nextNodeId}"`);
      });
    }

    if (node.config.elseNodeId) {
      console.log(`\n   ElseNodeId: "${node.config.elseNodeId}"`);
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

verificarCondiciones();
