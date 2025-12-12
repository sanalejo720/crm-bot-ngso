const{Client}=require("pg");
const c=new Client({
  host:"localhost",
  database:"crm_whatsapp",
  user:"crm_admin",
  password:"CRM_NgsoPass2024!"
});

async function main(){
  await c.connect();
  
  // Ver todos los nodos del flujo y sus conexiones
  const res = await c.query(`
    SELECT id, name, type, config, "nextNodeId" 
    FROM bot_nodes 
    WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
    ORDER BY name
  `);
  
  console.log("=== ESTRUCTURA DEL FLUJO ===\n");
  res.rows.forEach(n => {
    console.log(`📍 ${n.name} (${n.type})`);
    console.log(`   ID: ${n.id}`);
    console.log(`   nextNodeId: ${n.nextNodeId || 'NULL'}`);
    if (n.config.useButtons) {
      console.log(`   🔘 useButtons: true`);
      console.log(`   Botones: ${JSON.stringify(n.config.buttons)}`);
    }
    if (n.config.conditions) {
      console.log(`   Condiciones: ${JSON.stringify(n.config.conditions, null, 2)}`);
    }
    console.log('');
  });
  
  // El nodo "Saludo y Tratamiento de Datos" NO debería tener nextNodeId
  // porque con botones debe esperar la respuesta del usuario
  // El siguiente nodo debería determinarse por la condición
  
  console.log("\n=== CORRIGIENDO FLUJO ===\n");
  
  // 1. Quitar nextNodeId del nodo de Saludo (con botones, debe esperar)
  const saludoNode = res.rows.find(n => n.name === 'Saludo y Tratamiento de Datos');
  if (saludoNode && saludoNode.nextNodeId) {
    console.log(`Quitando nextNodeId de "${saludoNode.name}"`);
    console.log(`   Antes: nextNodeId = ${saludoNode.nextNodeId}`);
    
    await c.query('UPDATE bot_nodes SET "nextNodeId" = NULL WHERE id = $1', [saludoNode.id]);
    console.log('   Después: nextNodeId = NULL');
    console.log('   El nodo ahora esperará respuesta del usuario');
  }
  
  // 2. El nodo de condición debe configurarse para evaluar la respuesta
  const conditionNode = res.rows.find(n => n.name === 'Validar Aceptación');
  if (conditionNode) {
    console.log(`\nRevisando condición "${conditionNode.name}"`);
    console.log(`   Config actual:`, JSON.stringify(conditionNode.config, null, 2));
  }
  
  await c.end();
  console.log("\n✅ Flujo corregido");
}

main().catch(console.error);
