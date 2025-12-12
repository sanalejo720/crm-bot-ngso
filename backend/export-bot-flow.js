const { DataSource } = require("typeorm");

const LocalDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "postgres123",
  database: "crm_whatsapp",
});

async function exportBotFlow() {
  try {
    await LocalDataSource.initialize();
    console.log("✅ Conectado a base de datos LOCAL\n");

    // Obtener el flujo activo
    const flows = await LocalDataSource.query(`
      SELECT id, name, description, status, "createdAt", "updatedAt"
      FROM bot_flows 
      WHERE status = 'active' OR id = 'fd99cbfd-4b1d-4ded-a0f1-5af510024d9d'
      ORDER BY "updatedAt" DESC
      LIMIT 1
    `);

    if (flows.length === 0) {
      console.log("❌ No se encontró flujo activo");
      process.exit(1);
    }

    const flow = flows[0];
    console.log(`📋 Flujo encontrado: ${flow.name}`);
    console.log(`   ID: ${flow.id}`);
    console.log(`   Estado: ${flow.status}\n`);

    // Obtener los nodos del flujo
    const nodes = await LocalDataSource.query(`
      SELECT id, "flowId", name, type, config, "positionX", "positionY", "createdAt", "updatedAt"
      FROM bot_nodes 
      WHERE "flowId" = $1
      ORDER BY "positionY", "positionX"
    `, [flow.id]);

    console.log(`🔗 Nodos encontrados: ${nodes.length}\n`);

    nodes.forEach((node, index) => {
      console.log(`${index + 1}. ${node.name} (${node.type})`);
      if (node.config) {
        const config = typeof node.config === 'string' ? JSON.parse(node.config) : node.config;
        if (config.message) {
          const preview = config.message.substring(0, 60);
          console.log(`   Mensaje: ${preview}${config.message.length > 60 ? '...' : ''}`);
        }
        if (config.options) {
          console.log(`   Opciones: ${config.options.length}`);
        }
        if (config.conditions) {
          console.log(`   Condiciones: ${config.conditions.length}`);
        }
      }
      console.log(`   Posición: (${node.positionX}, ${node.positionY})\n`);
    });

    // Guardar en archivo JSON
    const exportData = {
      flow: {
        name: flow.name,
        description: flow.description,
        status: flow.status,
      },
      nodes: nodes.map(node => ({
        name: node.name,
        type: node.type,
        config: typeof node.config === 'string' ? JSON.parse(node.config) : node.config,
        positionX: node.positionX,
        positionY: node.positionY,
      }))
    };

    const fs = require('fs');
    fs.writeFileSync('bot-flow-export.json', JSON.stringify(exportData, null, 2));
    console.log("✅ Flujo exportado a: bot-flow-export.json");

    await LocalDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

exportBotFlow();
