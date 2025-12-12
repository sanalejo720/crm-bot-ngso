const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function conectarNodosFlujo() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Conectando nodos del flujo...\n');

    const flowId = '794e0e3c-c90b-49c7-91db-e25939d238ad';

    // Obtener todos los nodos del flujo en orden
    const nodes = await client.query(`
      SELECT id, name, type, config
      FROM bot_nodes
      WHERE "flowId" = $1
      ORDER BY "createdAt" ASC
    `, [flowId]);

    if (nodes.rows.length === 0) {
      console.log('❌ No se encontraron nodos');
      return;
    }

    console.log(`Nodos encontrados: ${nodes.rows.length}\n`);
    nodes.rows.forEach((node, i) => {
      console.log(`${i + 1}. ${node.name} (${node.type})`);
    });

    // Estructura del flujo:
    // 0: Saludo y Tratamiento de Datos -> 1 (Validación)
    // 1: Validación de Aceptación -> 3 (Solicitar Doc) si acepta, 2 (Rechazo) si no
    // 2: Rechazo de Tratamiento -> END
    // 3: Solicitar Documento -> 4 (Capturar)
    // 4: Capturar Documento -> 6 (Presentación)
    // 5: Documento Inválido -> 8 (Transferir)
    // 6: Presentación de Deuda -> 7 (Evaluar)
    // 7: Evaluar Opción -> 8 (Transferir) por defecto
    // 8: Transferir a Asesor -> END

    const updates = [
      // Nodo 0 (Saludo) -> Nodo 1 (Validación)
      { id: nodes.rows[0].id, nextNodeId: nodes.rows[1].id },
      
      // Nodo 1 (Validación) - es CONDITION, se configura después
      
      // Nodo 2 (Rechazo) -> null (END)
      { id: nodes.rows[2].id, nextNodeId: null },
      
      // Nodo 3 (Solicitar Documento) -> Nodo 4 (Capturar)
      { id: nodes.rows[3].id, nextNodeId: nodes.rows[4].id },
      
      // Nodo 4 (Capturar) -> Nodo 6 (Presentación)
      { id: nodes.rows[4].id, nextNodeId: nodes.rows[6].id },
      
      // Nodo 5 (Doc Inválido) -> Nodo 8 (Transferir)
      { id: nodes.rows[5].id, nextNodeId: nodes.rows[8].id },
      
      // Nodo 6 (Presentación) -> Nodo 7 (Evaluar)
      { id: nodes.rows[6].id, nextNodeId: nodes.rows[7].id },
      
      // Nodo 7 (Evaluar) - es CONDITION, se configura después
      
      // Nodo 8 (Transferir) -> null (END)
      { id: nodes.rows[8].id, nextNodeId: null },
    ];

    // Actualizar nextNodeId simple
    for (const update of updates) {
      if (update.nextNodeId !== undefined) {
        await client.query(`
          UPDATE bot_nodes
          SET "nextNodeId" = $1
          WHERE id = $2
        `, [update.nextNodeId, update.id]);
        console.log(`✅ Actualizado nextNodeId para nodo ${update.id}`);
      }
    }

    // Configurar nodo de validación (Nodo 1 - CONDITION)
    const validationConfig = {
      variable: 'user_response',
      conditions: [
        { operator: 'equals', value: '1', nextNodeId: nodes.rows[3].id },
        { operator: 'contains_ignore_case', value: 'acepto', nextNodeId: nodes.rows[3].id },
        { operator: 'contains_ignore_case', value: 'si', nextNodeId: nodes.rows[3].id },
      ],
      elseNodeId: nodes.rows[2].id // Rechazo
    };

    await client.query(`
      UPDATE bot_nodes
      SET config = $1
      WHERE id = $2
    `, [JSON.stringify(validationConfig), nodes.rows[1].id]);
    console.log(`✅ Configurado nodo de validación de aceptación`);

    // Configurar nodo de evaluación de opciones (Nodo 7 - CONDITION)
    const evaluationConfig = {
      variable: 'opcion_pago',
      conditions: [
        { operator: 'equals', value: '1', nextNodeId: nodes.rows[8].id }, // Pagar -> Transferir
        { operator: 'equals', value: '2', nextNodeId: nodes.rows[8].id }, // Acordar -> Transferir
        { operator: 'equals', value: '3', nextNodeId: nodes.rows[8].id }, // Asesor -> Transferir
      ],
      elseNodeId: nodes.rows[8].id // Por defecto -> Transferir
    };

    await client.query(`
      UPDATE bot_nodes
      SET config = $1
      WHERE id = $2
    `, [JSON.stringify(evaluationConfig), nodes.rows[7].id]);
    console.log(`✅ Configurado nodo de evaluación de opciones`);

    console.log('\n✅ Flujo conectado exitosamente!');
    console.log('\n📋 ESTRUCTURA FINAL:');
    console.log('   1. Saludo → Validación');
    console.log('   2. Si acepta → Solicitar Doc');
    console.log('   3. Si no acepta → Rechazo → END');
    console.log('   4. Solicitar Doc → Capturar Doc');
    console.log('   5. Capturar Doc → Presentación Deuda');
    console.log('   6. Presentación → Evaluar Opción');
    console.log('   7. Cualquier opción → Transferir a Asesor');
    console.log('   8. Transferir → END');

    console.log('\n🧹 Ahora limpia el chat:');
    console.log('   node limpiar-prueba.js');
    console.log('\n📱 Y prueba enviando un mensaje desde WhatsApp');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

conectarNodosFlujo();
