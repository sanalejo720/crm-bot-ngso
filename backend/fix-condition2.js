const{Client}=require("pg");
const c=new Client({
  host:"localhost",
  database:"crm_whatsapp",
  user:"crm_admin",
  password:"CRM_NgsoPass2024!"
});

async function main(){
  await c.connect();
  
  // Actualizar la condición para usar user_response y ser case-insensitive
  const newConfig = {
    conditions: [
      {
        id: "acepto",
        value: "acepto",
        operator: "contains_ignore_case",
        variable: "user_response",
        targetNodeId: "7b6519db-3b30-4464-beb7-f4717b53e334"  // Nodo siguiente si acepta
      },
      {
        id: "si",
        value: "si",
        operator: "contains_ignore_case", 
        variable: "user_response",
        targetNodeId: "7b6519db-3b30-4464-beb7-f4717b53e334"  // Mismo nodo si dice "si"
      },
      {
        id: "1",
        value: "1",
        operator: "equals",
        variable: "user_response",
        targetNodeId: "7b6519db-3b30-4464-beb7-f4717b53e334"  // Tambien si escribe "1"
      }
    ],
    defaultNodeId: "0b4de6c0-e352-48ab-b79f-9591d63ee75e"  // Nodo de rechazo por defecto
  };
  
  await c.query("UPDATE bot_nodes SET config=$1 WHERE name=$2", 
    [JSON.stringify(newConfig), "Validar Aceptación"]);
  
  console.log("Condicion actualizada!");
  console.log(JSON.stringify(newConfig, null, 2));
  
  // Mostrar todos los nodos para verificar
  const all = await c.query("SELECT id,name,type FROM bot_nodes ORDER BY name");
  console.log("\n=== TODOS LOS NODOS ===");
  all.rows.forEach(n => console.log(`${n.name} (${n.type}) - ${n.id}`));
  
  await c.end();
}

main().catch(console.error);
