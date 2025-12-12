const { DataSource } = require("typeorm");

const ProductionDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "crm_admin",
  password: "CRM_NgsoPass2024!",
  database: "crm_whatsapp",
});

const flowData = {
  "flow": {
    "name": "Flujo Cobranza con Validación",
    "description": "Flujo completo: tratamiento de datos, validación de documento y presentación de deuda",
    "status": "active"
  },
  "nodes": [
    {
      "name": "Saludo y Tratamiento de Datos",
      "type": "message",
      "config": {
        "message": "¡Hola! 👋 Somos del departamento de cobranzas de NGS&O Abogados.\n\nTe contactamos porque tienes una cuenta pendiente con nosotros.\n\nPara poder ayudarte, necesitamos que aceptes el tratamiento de tus datos personales según nuestra política de privacidad.\n\nPor favor responde:\n1️⃣ Acepto\n2️⃣ No acepto",
        "variables": [
          {
            "name": "company",
            "type": "string",
            "field": "metadata.compania",
            "source": "debtor",
            "default": "nuestra empresa"
          }
        ]
      },
      "positionX": 100,
      "positionY": 100
    },
    {
      "name": "Validar Aceptación",
      "type": "condition",
      "config": {
        "variable": "user_response",
        "conditions": [
          {
            "value": "1",
            "operator": "equals",
            "nextNodeName": "Solicitar Documento"
          },
          {
            "value": "acepto",
            "operator": "contains_ignore_case",
            "nextNodeName": "Solicitar Documento"
          },
          {
            "value": "si",
            "operator": "contains_ignore_case",
            "nextNodeName": "Solicitar Documento"
          }
        ],
        "elseNodeName": "Rechazo de Tratamiento"
      },
      "positionX": 100,
      "positionY": 250
    },
    {
      "name": "Solicitar Documento",
      "type": "message",
      "config": {
        "message": "Perfecto, gracias por aceptar. ✅\n\nPara verificar tu identidad y mostrarte la información de tu cuenta, necesito que me proporciones tu número de documento de identidad (Cédula).\n\nPor favor, escribe solo los números, sin puntos ni espacios.\n\nEjemplo: 1061749683",
        "saveResponse": true,
        "responseVariable": "documento"
      },
      "positionX": 300,
      "positionY": 250
    },
    {
      "name": "Capturar Documento",
      "type": "input",
      "config": {
        "nextNodeName": "Presentación de Deuda",
        "validation": {
          "type": "number",
          "maxLength": 12,
          "minLength": 6
        },
        "variableName": "documento_validado",
        "invalidNodeName": "Documento Inválido"
      },
      "positionX": 500,
      "positionY": 250
    },
    {
      "name": "Documento Inválido",
      "type": "message",
      "config": {
        "action": "wait_response",
        "message": "Lo siento, no encontré un registro con ese número de documento asociado a este número de teléfono. 🔍\n\nPor favor, verifica que el número de documento sea correcto o escribe \"ASESOR\" para ser transferido a un agente que pueda ayudarte. 👤",
        "timeout": 300
      },
      "positionX": 500,
      "positionY": 400
    },
    {
      "name": "Presentación de Deuda",
      "type": "message",
      "config": {
        "message": "¡Perfecto! Encontré tu información. 📋\n\n*DATOS DE TU CUENTA:*\n━━━━━━━━━━━━━━━━━━━\n👤 Nombre: {{debtor.fullName}}\n🆔 Documento: {{debtor.documentType}} {{debtor.documentNumber}}\n🏢 Producto: {{debtor.metadata.producto}}\n💰 Deuda Total: ${{debtor.debtAmount}}\n⏰ Días de Mora: {{debtor.daysOverdue}} días\n📅 Fecha de Vencimiento: {{debtor.metadata.fechaVencimiento}}\n━━━━━━━━━━━━━━━━━━━\n\nPara resolver esta situación, puedes:\n\n1️⃣ Pagar ahora\n2️⃣ Acordar fecha de pago\n3️⃣ Hablar con un asesor\n\nPor favor, responde con el número de tu opción.",
        "variables": [
          {
            "name": "debtor.fullName",
            "type": "string",
            "field": "fullName",
            "source": "debtor"
          },
          {
            "name": "debtor.documentType",
            "type": "string",
            "field": "documentType",
            "source": "debtor"
          },
          {
            "name": "debtor.documentNumber",
            "type": "string",
            "field": "documentNumber",
            "source": "debtor"
          },
          {
            "name": "debtor.metadata.producto",
            "type": "string",
            "field": "metadata.producto",
            "source": "debtor"
          },
          {
            "name": "debtor.debtAmount",
            "type": "number",
            "field": "debtAmount",
            "source": "debtor"
          },
          {
            "name": "debtor.daysOverdue",
            "type": "number",
            "field": "daysOverdue",
            "source": "debtor"
          },
          {
            "name": "debtor.metadata.fechaVencimiento",
            "type": "string",
            "field": "metadata.fechaVencimiento",
            "source": "debtor"
          }
        ],
        "saveResponse": true,
        "responseVariable": "opcion_pago"
      },
      "positionX": 700,
      "positionY": 250
    },
    {
      "name": "Evaluar Opción",
      "type": "condition",
      "config": {
        "variable": "opcion_pago",
        "conditions": [
          {
            "value": "1",
            "operator": "equals",
            "nextNodeName": "Transferir a Asesor"
          },
          {
            "value": "2",
            "operator": "equals",
            "nextNodeName": "Transferir a Asesor"
          },
          {
            "value": "3",
            "operator": "equals",
            "nextNodeName": "Transferir a Asesor"
          }
        ],
        "elseNodeName": "Transferir a Asesor"
      },
      "positionX": 900,
      "positionY": 250
    },
    {
      "name": "Transferir a Asesor",
      "type": "transfer_agent",
      "config": {
        "reason": "requested_by_customer",
        "message": "Perfecto, en un momento uno de nuestros asesores será asignado a tu caso para ayudarte con tu solicitud. ⏳\n\nPor favor espera un momento mientras te conectamos con un especialista.",
        "priority": "high"
      },
      "positionX": 1100,
      "positionY": 250
    },
    {
      "name": "Rechazo de Tratamiento",
      "type": "message",
      "config": {
        "action": "transfer_to_agent",
        "message": "Entendemos tu decisión. Sin embargo, sin tu autorización no podemos continuar.\n\nSi cambias de opinión o deseas hablar con un asesor, puedes escribirnos nuevamente.\n\n¡Que tengas un buen día! 👋"
      },
      "positionX": 100,
      "positionY": 400
    }
  ]
};

async function importBotFlow() {
  try {
    await ProductionDataSource.initialize();
    console.log("✅ Conectado a base de datos PRODUCCIÓN\n");

    // Crear el flujo
    console.log(`📋 Creando flujo: ${flowData.flow.name}...`);
    
    const flowResult = await ProductionDataSource.query(
      `INSERT INTO bot_flows (id, name, description, status, "createdAt", "updatedAt") 
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW()) 
       RETURNING id`,
      [flowData.flow.name, flowData.flow.description, flowData.flow.status]
    );

    const flowId = flowResult[0].id;
    console.log(`✅ Flujo creado con ID: ${flowId}\n`);

    // Crear los nodos y mapear nombres a IDs
    console.log(`🔗 Creando ${flowData.nodes.length} nodos...\n`);
    const nodeIdMap = {};

    for (const node of flowData.nodes) {
      const nodeResult = await ProductionDataSource.query(
        `INSERT INTO bot_nodes (id, "flowId", name, type, config, "positionX", "positionY", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING id`,
        [
          flowId,
          node.name,
          node.type,
          JSON.stringify(node.config),
          node.positionX,
          node.positionY
        ]
      );

      nodeIdMap[node.name] = nodeResult[0].id;
      console.log(`  ✓ ${node.name} (${node.type})`);
    }

    // Actualizar las referencias de nextNodeName a nextNodeId
    console.log(`\n🔗 Conectando nodos...`);

    for (const node of flowData.nodes) {
      const nodeId = nodeIdMap[node.name];
      let config = node.config;
      let updated = false;

      // Para nodos tipo condition
      if (node.type === 'condition' && config.conditions) {
        config.conditions = config.conditions.map(cond => {
          if (cond.nextNodeName && nodeIdMap[cond.nextNodeName]) {
            updated = true;
            return {
              ...cond,
              nextNodeId: nodeIdMap[cond.nextNodeName],
              nextNodeName: undefined
            };
          }
          return cond;
        });

        if (config.elseNodeName && nodeIdMap[config.elseNodeName]) {
          config.elseNodeId = nodeIdMap[config.elseNodeName];
          delete config.elseNodeName;
          updated = true;
        }
      }

      // Para nodos tipo input
      if (node.type === 'input' && config.nextNodeName && nodeIdMap[config.nextNodeName]) {
        config.nextNodeId = nodeIdMap[config.nextNodeName];
        delete config.nextNodeName;
        updated = true;
      }

      if (node.type === 'input' && config.invalidNodeName && nodeIdMap[config.invalidNodeName]) {
        config.invalidNodeId = nodeIdMap[config.invalidNodeName];
        delete config.invalidNodeName;
        updated = true;
      }

      if (updated) {
        await ProductionDataSource.query(
          `UPDATE bot_nodes SET config = $1 WHERE id = $2`,
          [JSON.stringify(config), nodeId]
        );
        console.log(`  ✓ Conexiones actualizadas para: ${node.name}`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎉 ¡Flujo importado exitosamente!`);
    console.log(`\n📋 Información del flujo:`);
    console.log(`   Nombre: ${flowData.flow.name}`);
    console.log(`   ID: ${flowId}`);
    console.log(`   Estado: ${flowData.flow.status}`);
    console.log(`   Nodos: ${flowData.nodes.length}`);
    console.log(`\n💡 Siguiente paso:`);
    console.log(`   Asocia este flujo a tu campaña desde el panel de administración`);
    console.log(`   o actualiza la campaña con el flowId: ${flowId}`);

    await ProductionDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.detail) console.error("   Detalle:", error.detail);
    process.exit(1);
  }
}

importBotFlow();
