const{Client}=require("pg");
const fs = require('fs');

const c=new Client({
  host:"localhost",
  database:"crm_whatsapp",
  user:"crm_admin",
  password:"CRM_NgsoPass2024!"
});

async function main(){
  await c.connect();
  console.log("Conectado a PostgreSQL");
  
  // 1. Actualizar el nodo de Saludo para que tenga responseNodeId
  // El nodo de saludo con botones debe apuntar al nodo de condición que evalúa la respuesta
  
  const conditionNodeId = '70e3ffa2-6744-461d-a14e-527763d245db'; // Validar Aceptación
  
  // Obtener config actual del nodo de saludo
  const saludoRes = await c.query(`
    SELECT id, config FROM bot_nodes WHERE name = 'Saludo y Tratamiento de Datos'
  `);
  
  if (saludoRes.rows.length > 0) {
    const saludo = saludoRes.rows[0];
    const newConfig = {
      ...saludo.config,
      responseNodeId: conditionNodeId  // Nodo que procesará la respuesta del usuario
    };
    
    await c.query('UPDATE bot_nodes SET config = $1 WHERE id = $2', 
      [JSON.stringify(newConfig), saludo.id]);
    
    console.log("✅ Nodo de Saludo actualizado con responseNodeId:", conditionNodeId);
  }
  
  await c.end();
  
  // 2. Parchear bot-engine.service.js para manejar MESSAGE con botones
  console.log("\nParcheando bot-engine.service.js...");
  
  const botEngineFile = '/var/www/crm-ngso-whatsapp/backend/dist/modules/bot/bot-engine.service.js';
  let content = fs.readFileSync(botEngineFile, 'utf8');
  
  // Buscar el switch en processUserInput y agregar case para MESSAGE
  const switchPattern = /switch \(currentNode\.type\) \{/;
  
  if (content.includes('case BotNodeType.MESSAGE:') || content.includes("case 'message':")) {
    console.log("El case MESSAGE ya existe");
  } else {
    // Agregar el case para MESSAGE antes del default
    const messageCase = `
      case 'message':
        // Si el nodo tiene botones y responseNodeId, avanzar a ese nodo
        if (currentNode.config.useButtons && currentNode.config.responseNodeId) {
          session.variables['user_response'] = userInput;
          nextNodeId = currentNode.config.responseNodeId;
          this.logger.log('Respuesta de botones recibida: ' + userInput);
        } else {
          nextNodeId = currentNode.nextNodeId;
        }
        break;
`;
    
    // Insertar antes del default
    content = content.replace(
      /default:\s*nextNodeId = currentNode\.nextNodeId;/,
      messageCase + '\n      default:\n        nextNodeId = currentNode.nextNodeId;'
    );
    
    fs.writeFileSync(botEngineFile, content);
    console.log("✅ Case MESSAGE agregado a processUserInput");
  }
  
  console.log("\n✅ Fix completo aplicado");
}

main().catch(console.error);
