const{Client}=require("pg");
const c=new Client({
  host:"localhost",
  database:"crm_whatsapp",
  user:"crm_admin",
  password:"CRM_NgsoPass2024!"
});

async function main(){
  await c.connect();
  console.log("Conectado");
  
  // Ver nodos
  const res = await c.query("SELECT id,name,type,config FROM bot_nodes ORDER BY name");
  console.log("\n=== NODOS ===");
  res.rows.forEach(x=>console.log(x.name,"(",x.type,")"));
  
  // Buscar nodo de Saludo/Tratamiento de datos
  const inputNodes = res.rows.filter(r => 
    r.type === 'input' && 
    r.config && 
    r.config.message && 
    (r.config.message.includes('autoriza') || r.config.message.includes('acepta'))
  );
  
  console.log("\n=== NODOS INPUT CON AUTORIZACION ===");
  inputNodes.forEach(n => {
    console.log(n.name);
    console.log("  Message:", n.config.message?.substring(0,100));
  });
  
  // Actualizar con botones
  for(const node of inputNodes) {
    console.log("\nActualizando:", node.name);
    
    let msg = node.config.message || "";
    msg = msg.replace(/\s*Escriba.*rechazar\.?/gi, "");
    
    const newConfig = {
      ...node.config,
      message: msg.trim(),
      useButtons: true,
      buttonTitle: "Responda",
      buttons: [
        {id:"si", text:"Si, acepto", value:"si"},
        {id:"no", text:"No acepto", value:"no"}
      ]
    };
    
    await c.query("UPDATE bot_nodes SET config=$1 WHERE id=$2", [JSON.stringify(newConfig), node.id]);
    console.log("OK - Botones agregados");
  }
  
  // Tambien buscar nodos MESSAGE con la misma pregunta
  const msgNodes = res.rows.filter(r => 
    r.type === 'message' && 
    r.config && 
    r.config.message && 
    (r.config.message.includes('autoriza') || r.config.message.includes('Escriba'))
  );
  
  console.log("\n=== NODOS MESSAGE CON AUTORIZACION ===");
  for(const node of msgNodes) {
    console.log(node.name);
    console.log("  Message:", node.config.message?.substring(0,100));
    
    let msg = node.config.message || "";
    msg = msg.replace(/\s*Escriba.*rechazar\.?/gi, "");
    
    const newConfig = {
      ...node.config,
      message: msg.trim(),
      useButtons: true,
      buttonTitle: "Autorizacion",
      buttons: [
        {id:"si", text:"Si, acepto", value:"si"},
        {id:"no", text:"No acepto", value:"no"}
      ]
    };
    
    await c.query("UPDATE bot_nodes SET config=$1 WHERE id=$2", [JSON.stringify(newConfig), node.id]);
    console.log("OK - Botones agregados");
  }
  
  await c.end();
  console.log("\nFinalizado");
}

main().catch(e=>{console.error(e);c.end();});
