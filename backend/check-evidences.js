const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function checkEvidences() {
  try {
    console.log('🔍 Verificando evidencias en la base de datos...\n');
    
    const result = await pool.query(`
      SELECT 
        "ticketNumber",
        "closureType",
        "clientName",
        "agentName",
        amount,
        "createdAt"
      FROM evidences 
      ORDER BY "createdAt" DESC 
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ No se encontraron evidencias en la base de datos');
      console.log('');
      console.log('💡 Posibles causas:');
      console.log('   1. No se ha cerrado ninguna negociación todavía');
      console.log('   2. El código de creación de evidencias no se ejecutó correctamente');
      console.log('   3. Hay un error en la integración con chats-export.service.ts');
    } else {
      console.log(`✅ Se encontraron ${result.rows.length} evidencias:\n`);
      result.rows.forEach((evidence, index) => {
        console.log(`${index + 1}. Ticket: ${evidence.ticketNumber}`);
        console.log(`   Tipo: ${evidence.closureType}`);
        console.log(`   Cliente: ${evidence.clientName}`);
        console.log(`   Asesor: ${evidence.agentName}`);
        console.log(`   Monto: $${evidence.amount}`);
        console.log(`   Fecha: ${evidence.createdAt}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error al verificar evidencias:', error.message);
  } finally {
    await pool.end();
  }
}

checkEvidences();
