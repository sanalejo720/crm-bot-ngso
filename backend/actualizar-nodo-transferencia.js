const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function actualizarNodoTransferencia() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Actualizando nodo de transferencia...\n');

    const flowId = '794e0e3c-c90b-49c7-91db-e25939d238ad';

    // Actualizar el mensaje del nodo de transferencia
    const nuevoMensaje = `Perfecto, en un momento uno de nuestros asesores será asignado a tu caso para ayudarte con tu solicitud. ⏳

Por favor espera un momento mientras te conectamos con un especialista.`;

    const result = await client.query(`
      UPDATE bot_nodes
      SET config = jsonb_set(
        config,
        '{message}',
        $1
      )
      WHERE "flowId" = $2
        AND name = 'Transferir a Asesor'
      RETURNING id, name
    `, [JSON.stringify(nuevoMensaje), flowId]);

    if (result.rowCount > 0) {
      console.log(`✅ Nodo actualizado: ${result.rows[0].name}`);
      console.log(`   ID: ${result.rows[0].id}`);
      console.log('\n📋 Nuevo mensaje:');
      console.log(nuevoMensaje);
    } else {
      console.log('❌ No se encontró el nodo');
    }

    console.log('\n✅ Actualización completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

actualizarNodoTransferencia();
