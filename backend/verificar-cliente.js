const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function verificarCliente() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando cliente asociado al chat...\n');

    // Verificar cliente
    const result = await client.query(`
      SELECT 
        c.id, 
        c."fullName", 
        c.phone, 
        c.email, 
        c.company,
        c.tags,
        c."customFields"
      FROM clients c
      WHERE c.id = '1fcfa7ea-0f74-4962-9c67-cd4f528537b6'
    `);
    
    if (result.rows.length > 0) {
      const cl = result.rows[0];
      console.log('👤 CLIENTE:');
      console.log(`   ID: ${cl.id}`);
      console.log(`   Nombre: ${cl.fullName}`);
      console.log(`   Teléfono: ${cl.phone}`);
      console.log(`   Email: ${cl.email || 'NULL'}`);
      console.log(`   Empresa: ${cl.company || 'NULL'}`);
      console.log(`   Tags: ${JSON.stringify(cl.tags)}`);
      console.log(`   Custom Fields: ${JSON.stringify(cl.customFields)}`);
    } else {
      console.log('❌ Cliente no encontrado');
    }

    // Verificar el chat completo con el cliente
    const chatResult = await client.query(`
      SELECT 
        ch.id as chat_id,
        ch."contactPhone",
        ch."clientId",
        c."fullName" as client_name,
        c.phone as client_phone,
        c."customFields"
      FROM chats ch
      LEFT JOIN clients c ON c.id = ch."clientId"
      WHERE ch."contactPhone" = '573334309474@c.us'
    `);

    console.log('\n💬 CHAT CON CLIENTE:');
    if (chatResult.rows.length > 0) {
      const chat = chatResult.rows[0];
      console.log(`   Chat ID: ${chat.chat_id}`);
      console.log(`   Contact Phone: ${chat.contactPhone}`);
      console.log(`   Client ID: ${chat.clientId}`);
      console.log(`   Client Name: ${chat.client_name}`);
      console.log(`   Client Phone: ${chat.client_phone}`);
      console.log(`   Custom Fields: ${JSON.stringify(chat.customFields)}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verificarCliente();
