const{Client}=require("pg");
const c=new Client({
  host:"localhost",
  database:"crm_whatsapp",
  user:"crm_admin",
  password:"CRM_NgsoPass2024!"
});

async function main(){
  await c.connect();
  
  // Ver el nodo de Saludo
  const res = await c.query("SELECT name,config FROM bot_nodes WHERE name LIKE '%Saludo%'");
  console.log("Nodo Saludo:");
  console.log(JSON.stringify(res.rows[0], null, 2));
  
  // Actualizar ESTE nodo con botones
  if(res.rows[0]) {
    const node = res.rows[0];
    const newConfig = {
      ...node.config,
      useButtons: true,
      buttonTitle: "Autorizacion de datos",
      buttons: [
        {id:"si", text:"Si, acepto", value:"si"},
        {id:"no", text:"No acepto", value:"no"}
      ]
    };
    
    await c.query("UPDATE bot_nodes SET config=$1 WHERE name=$2", [JSON.stringify(newConfig), node.name]);
    console.log("\nActualizado con botones!");
    console.log(JSON.stringify(newConfig, null, 2));
  }
  
  await c.end();
}

main().catch(console.error);
