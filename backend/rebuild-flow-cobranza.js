const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!',
});

async function rebuildFlow() {
  const client = await pool.connect();
  try {
    console.log('✅ Conectado a la base de datos\n');

    const flowId = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

    // IDs de los nodos existentes (en el orden correcto del flujo)
    const nodes = {
      saludo: 'a6c33649-8dc2-41c3-a519-de5d725e5e74',
      validarAceptacion: '70e3ffa2-6744-461d-a14e-527763d245db',
      rechazo: '0b4de6c0-e352-48ab-b79f-9591d63ee75e',
      solicitarDoc: '7b6519db-3b30-4464-beb7-f4717b53e334',
      capturarDoc: '2a700292-c7e0-4645-aaf1-f6423d790a86',
      docInvalido: '86e82947-8080-4fe0-bbd5-0365fa549608',
      presentacionDeuda: '4dc222ff-adeb-4e6d-8bf8-97a468688ee2',
      evaluarOpcion: '17f1f198-282a-45ad-8713-6007c3062b69',
      transferir: 'baa09935-9763-4067-8d86-e3975c542dbd'
    };

    console.log('🔧 Reconstruyendo conexiones del flujo...\n');

    // 1. Saludo y Tratamiento → Validar Aceptación
    await client.query(
      `UPDATE bot_nodes SET "nextNodeId" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [nodes.validarAceptacion, nodes.saludo]
    );
    console.log('✅ Saludo → Validar Aceptación');

    // 2. Validar Aceptación (condition)
    // - Si acepta (sí): ir a Solicitar Documento
    // - Si rechaza (no): ir a Rechazo
    // - Por defecto: ir a Solicitar Documento
    const conditionConfig = {
      conditions: [
        {
          id: '1',
          variable: 'aceptacion',
          operator: 'equals',
          value: 'sí',
          targetNodeId: nodes.solicitarDoc
        },
        {
          id: '2',
          variable: 'aceptacion',
          operator: 'equals',
          value: 'no',
          targetNodeId: nodes.rechazo
        }
      ],
      defaultNodeId: nodes.solicitarDoc
    };
    
    await client.query(
      `UPDATE bot_nodes SET config = $1, "nextNodeId" = $2, "updatedAt" = NOW() WHERE id = $3`,
      [JSON.stringify(conditionConfig), nodes.solicitarDoc, nodes.validarAceptacion]
    );
    console.log('✅ Validar Aceptación → Solicitar Documento (sí) / Rechazo (no)');

    // 3. Rechazo → null (fin)
    await client.query(
      `UPDATE bot_nodes SET "nextNodeId" = NULL, "updatedAt" = NOW() WHERE id = $1`,
      [nodes.rechazo]
    );
    console.log('✅ Rechazo → FIN');

    // 4. Solicitar Documento → Capturar Documento
    await client.query(
      `UPDATE bot_nodes SET "nextNodeId" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [nodes.capturarDoc, nodes.solicitarDoc]
    );
    console.log('✅ Solicitar Documento → Capturar Documento');

    // 5. Capturar Documento → Presentación de Deuda (cuando encuentra debtor)
    // El nodo de entrada tiene validación en el código que redirige a docInvalido si no encuentra
    await client.query(
      `UPDATE bot_nodes SET "nextNodeId" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [nodes.presentacionDeuda, nodes.capturarDoc]
    );
    console.log('✅ Capturar Documento → Presentación de Deuda');

    // 6. Documento Inválido → Solicitar Documento (reintentar)
    await client.query(
      `UPDATE bot_nodes SET "nextNodeId" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [nodes.solicitarDoc, nodes.docInvalido]
    );
    console.log('✅ Documento Inválido → Solicitar Documento');

    // 7. Presentación de Deuda → Evaluar Opción
    await client.query(
      `UPDATE bot_nodes SET "nextNodeId" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [nodes.evaluarOpcion, nodes.presentacionDeuda]
    );
    console.log('✅ Presentación de Deuda → Evaluar Opción');

    // 8. Evaluar Opción (condition)
    // - opcion = 1: Transferir a asesor
    // - opcion = 2: Reagendar (por ahora FIN)
    // - Por defecto: Transferir
    const evaluarConfig = {
      conditions: [
        {
          id: '1',
          variable: 'opcion',
          operator: 'equals',
          value: '1',
          targetNodeId: nodes.transferir
        },
        {
          id: '2',
          variable: 'opcion',
          operator: 'equals',
          value: '2',
          targetNodeId: null // Por ahora termina, luego agregar nodo de reagendamiento
        }
      ],
      defaultNodeId: nodes.transferir
    };
    
    await client.query(
      `UPDATE bot_nodes SET config = $1, "nextNodeId" = $2, "updatedAt" = NOW() WHERE id = $3`,
      [JSON.stringify(evaluarConfig), nodes.transferir, nodes.evaluarOpcion]
    );
    console.log('✅ Evaluar Opción → Transferir (1) / FIN (2)');

    // 9. Transferir a Asesor → null (fin)
    await client.query(
      `UPDATE bot_nodes SET "nextNodeId" = NULL, "updatedAt" = NOW() WHERE id = $1`,
      [nodes.transferir]
    );
    console.log('✅ Transferir → FIN\n');

    // Verificar el flujo reconstruido
    console.log('📋 VERIFICANDO FLUJO RECONSTRUIDO:\n');
    
    const { rows: verifyNodes } = await client.query(
      `SELECT id, name, type, "nextNodeId", config FROM bot_nodes WHERE "flowId" = $1 ORDER BY "createdAt"`,
      [flowId]
    );

    let allValid = true;
    for (const node of verifyNodes) {
      if (node.nextNodeId) {
        const exists = verifyNodes.find(n => n.id === node.nextNodeId);
        if (!exists) {
          console.log(`❌ ${node.name} → nextNodeId ${node.nextNodeId} NO EXISTE`);
          allValid = false;
        } else {
          console.log(`✅ ${node.name} → ${exists.name}`);
        }
      } else {
        console.log(`✅ ${node.name} → FIN`);
      }

      // Verificar conditions
      if (node.type === 'condition' && node.config) {
        const config = typeof node.config === 'string' ? JSON.parse(node.config) : node.config;
        if (config.conditions) {
          for (const cond of config.conditions) {
            if (cond.targetNodeId) {
              const targetExists = verifyNodes.find(n => n.id === cond.targetNodeId);
              if (!targetExists) {
                console.log(`   ❌ Condición → ${cond.targetNodeId} NO EXISTE`);
                allValid = false;
              }
            }
          }
        }
      }
    }

    if (allValid) {
      console.log('\n🎉 ¡Flujo reconstruido exitosamente! Todas las referencias son válidas.');
    } else {
      console.log('\n⚠️  Algunas referencias aún están rotas.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

rebuildFlow();
