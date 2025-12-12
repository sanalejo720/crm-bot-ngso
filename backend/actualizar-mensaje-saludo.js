const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function actualizarMensajeSaludo() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Actualizando mensaje de saludo con nombre de empresa...\n');

    const flowId = '794e0e3c-c90b-49c7-91db-e25939d238ad';

    // Actualizar el nodo de saludo para que use el nombre correcto de la empresa
    const nuevoMensaje = `¡Hola! 👋 Somos del departamento de cobranzas de NGS&O Abogados.

Te contactamos porque tienes una cuenta pendiente con nosotros.

Para poder ayudarte, necesitamos que aceptes el tratamiento de tus datos personales según nuestra política de privacidad.

Por favor responde:
1️⃣ Acepto
2️⃣ No acepto`;

    const result = await client.query(`
      UPDATE bot_nodes
      SET config = jsonb_set(
        config,
        '{message}',
        $1
      )
      WHERE "flowId" = $2
        AND name = 'Saludo y Tratamiento de Datos'
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

actualizarMensajeSaludo();
