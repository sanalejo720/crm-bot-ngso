const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function crearFlujoCobranza() {
  const client = await pool.connect();
  
  try {
    console.log('🤖 Creando flujo de cobranza completo...\n');

    // 1. Crear el flujo
    const flowResult = await client.query(`
      INSERT INTO bot_flows (name, description, status, settings)
      VALUES (
        'Flujo Cobranza con Validación',
        'Flujo completo: tratamiento de datos, validación de documento y presentación de deuda',
        'active',
        '{"maxInactivityTime": 5, "transferToAgentOnError": true, "fallbackMessage": "No entendí tu respuesta. Por favor, escribe una opción válida."}'::jsonb
      )
      RETURNING id
    `);
    
    const flowId = flowResult.rows[0].id;
    console.log(`✅ Flujo creado: ${flowId}\n`);

    // 2. NODO 1: Saludo y solicitud de tratamiento de datos
    const node1 = await client.query(`
      INSERT INTO bot_nodes (
        "flowId",
        type,
        name,
        config
      ) VALUES (
        $1,
        'message',
        'Saludo y Tratamiento de Datos',
        $2::jsonb
      )
      RETURNING id
    `, [
      flowId,
      JSON.stringify({
        message: `¡Hola! 👋 Somos del departamento de cobranzas de {{company}}.

Te contactamos porque tienes una cuenta pendiente con nosotros.

Para poder ayudarte, necesitamos que aceptes el tratamiento de tus datos personales según nuestra política de privacidad.

Por favor responde:
1️⃣ Acepto
2️⃣ No acepto`,
        variables: [
          { name: 'company', type: 'string', source: 'debtor', field: 'metadata.compania', default: 'nuestra empresa' }
        ]
      })
    ]);
    console.log(`✅ Nodo 1 creado: Saludo y Tratamiento de Datos`);

    // 3. NODO 2: Validación de aceptación
    const node2 = await client.query(`
      INSERT INTO bot_nodes (
        "flowId",
        type,
        name,
        config
      ) VALUES (
        $1,
        'condition',
        'Validar Aceptación',
        $2::jsonb
      )
      RETURNING id
    `, [
      flowId,
      JSON.stringify({
        variable: 'user_response',
        conditions: [
          {
            operator: 'equals_ignore_case',
            value: '1',
            nextNodeId: null // Se actualizará después
          },
          {
            operator: 'contains_ignore_case',
            value: 'acepto',
            nextNodeId: null
          },
          {
            operator: 'equals_ignore_case',
            value: 'si',
            nextNodeId: null
          }
        ],
        elseNodeId: null // Se actualizará después
      })
    ]);
    console.log(`✅ Nodo 2 creado: Validación de Aceptación`);

    // 4. NODO 3: Rechazo de tratamiento
    const node3 = await client.query(`
      INSERT INTO bot_nodes (
        "flowId",
        type,
        name,
        config
      ) VALUES (
        $1,
        'message',
        'Rechazo de Tratamiento',
        $2::jsonb
      )
      RETURNING id
    `, [
      flowId,
      JSON.stringify({
        message: `Entendemos tu decisión. Sin embargo, sin tu autorización no podemos continuar.

Si cambias de opinión o deseas hablar con un asesor, puedes escribirnos nuevamente.

¡Que tengas un buen día! 👋`,
        action: 'transfer_to_agent'
      })
    ]);
    console.log(`✅ Nodo 3 creado: Rechazo de Tratamiento`);

    // 5. NODO 4: Solicitud de documento
    const node4 = await client.query(`
      INSERT INTO bot_nodes (
        "flowId",
        type,
        name,
        config
      ) VALUES (
        $1,
        'message',
        'Solicitar Documento',
        $2::jsonb
      )
      RETURNING id
    `, [
      flowId,
      JSON.stringify({
        message: `Perfecto, gracias por aceptar. ✅

Para verificar tu identidad y mostrarte la información de tu cuenta, necesito que me proporciones tu número de documento de identidad (Cédula).

Por favor, escribe solo los números, sin puntos ni espacios.

Ejemplo: 1061749683`,
        saveResponse: true,
        responseVariable: 'documento'
      })
    ]);
    console.log(`✅ Nodo 4 creado: Solicitar Documento`);

    // 6. NODO 5: Validar documento (usando INPUT para capturar)
    const node5 = await client.query(`
      INSERT INTO bot_nodes (
        "flowId",
        type,
        name,
        config
      ) VALUES (
        $1,
        'input',
        'Capturar Documento',
        $2::jsonb
      )
      RETURNING id
    `, [
      flowId,
      JSON.stringify({
        variableName: 'documento_validado',
        validation: {
          type: 'number',
          minLength: 6,
          maxLength: 12
        },
        nextNodeId: null
      })
    ]);
    console.log(`✅ Nodo 5 creado: Validar Documento`);

    // 7. NODO 6: Documento inválido
    const node6 = await client.query(`
      INSERT INTO bot_nodes (
        "flowId",
        type,
        name,
        config
      ) VALUES (
        $1,
        'message',
        'Documento Inválido',
        $2::jsonb
      )
      RETURNING id
    `, [
      flowId,
      JSON.stringify({
        message: `Lo siento, no encontré un registro con ese número de documento asociado a este número de teléfono. 🔍

Por favor, verifica que el número de documento sea correcto o escribe "ASESOR" para ser transferido a un agente que pueda ayudarte. 👤`,
        action: 'wait_response',
        timeout: 300 // 5 minutos
      })
    ]);
    console.log(`✅ Nodo 6 creado: Documento Inválido`);

    // 8. NODO 7: Presentación de deuda
    const node7 = await client.query(`
      INSERT INTO bot_nodes (
        "flowId",
        type,
        name,
        config
      ) VALUES (
        $1,
        'message',
        'Presentación de Deuda',
        $2::jsonb
      )
      RETURNING id
    `, [
      flowId,
      JSON.stringify({
        message: '¡Perfecto! Encontré tu información. 📋\n\n' +
          '*DATOS DE TU CUENTA:*\n' +
          '━━━━━━━━━━━━━━━━━━━\n' +
          '👤 Nombre: {{debtor.fullName}}\n' +
          '🆔 Documento: {{debtor.documentType}} {{debtor.documentNumber}}\n' +
          '🏢 Producto: {{debtor.metadata.producto}}\n' +
          '💰 Deuda Total: ${{debtor.debtAmount}}\n' +
          '⏰ Días de Mora: {{debtor.daysOverdue}} días\n' +
          '📅 Fecha de Vencimiento: {{debtor.metadata.fechaVencimiento}}\n' +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          'Para resolver esta situación, puedes:\n\n' +
          '1️⃣ Pagar ahora\n' +
          '2️⃣ Acordar fecha de pago\n' +
          '3️⃣ Hablar con un asesor\n\n' +
          'Por favor, responde con el número de tu opción.',
        variables: [
          { name: 'debtor.fullName', type: 'string', source: 'debtor', field: 'fullName' },
          { name: 'debtor.documentType', type: 'string', source: 'debtor', field: 'documentType' },
          { name: 'debtor.documentNumber', type: 'string', source: 'debtor', field: 'documentNumber' },
          { name: 'debtor.metadata.producto', type: 'string', source: 'debtor', field: 'metadata.producto' },
          { name: 'debtor.debtAmount', type: 'number', source: 'debtor', field: 'debtAmount' },
          { name: 'debtor.daysOverdue', type: 'number', source: 'debtor', field: 'daysOverdue' },
          { name: 'debtor.metadata.fechaVencimiento', type: 'string', source: 'debtor', field: 'metadata.fechaVencimiento' }
        ],
        saveResponse: true,
        responseVariable: 'opcion_pago'
      })
    ]);
    console.log(`✅ Nodo 7 creado: Presentación de Deuda`);

    // 9. NODO 8: Decisión de opciones
    const node8 = await client.query(`
      INSERT INTO bot_nodes (
        "flowId",
        type,
        name,
        config
      ) VALUES (
        $1,
        'condition',
        'Evaluar Opción',
        $2::jsonb
      )
      RETURNING id
    `, [
      flowId,
      JSON.stringify({
        variable: 'opcion_pago',
        conditions: [
          {
            operator: 'equals',
            value: '1',
            nextNodeId: null // Nodo de pago
          },
          {
            operator: 'equals',
            value: '2',
            nextNodeId: null // Nodo de promesa
          },
          {
            operator: 'equals',
            value: '3',
            nextNodeId: null // Transferir a asesor
          }
        ],
        elseNodeId: null
      })
    ]);
    console.log(`✅ Nodo 8 creado: Evaluar Opción`);

    // 10. NODO 9: Transferir a asesor
    const node9 = await client.query(`
      INSERT INTO bot_nodes (
        "flowId",
        type,
        name,
        config
      ) VALUES (
        $1,
        'transfer_agent',
        'Transferir a Asesor',
        $2::jsonb
      )
      RETURNING id
    `, [
      flowId,
      JSON.stringify({
        message: 'Perfecto, te voy a conectar con un asesor especializado que podrá ayudarte con tu caso. 👤\n\nPor favor espera un momento...',
        priority: 'high',
        reason: 'requested_by_customer'
      })
    ]);
    console.log(`✅ Nodo 9 creado: Transferir a Asesor`);

    // Actualizar startNodeId del flujo
    await client.query(`
      UPDATE bot_flows 
      SET "startNodeId" = $1
      WHERE id = $2
    `, [node1.rows[0].id, flowId]);

    console.log(`\n✅ Flujo de cobranza creado exitosamente!`);
    console.log(`\n📋 RESUMEN:`);
    console.log(`   Flow ID: ${flowId}`);
    console.log(`   Nodos creados: 9`);
    console.log(`   Estado: active`);
    console.log(`\n🔄 Ahora actualiza la campaña con este flujo:`);
    console.log(`   Flow ID para copiar: ${flowId}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

crearFlujoCobranza();
