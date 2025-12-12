const{Client}=require("pg");
const c=new Client({
  host:"localhost",
  database:"crm_whatsapp",
  user:"crm_admin",
  password:"CRM_NgsoPass2024!"
});

async function main(){
  await c.connect();
  
  // Actualizar el nodo de Saludo - limpiar mensaje y configurar botones
  const newMessage = `¡Hola! 👋 Somos NGS&O Abogados.

¿Tienes una deuda pendiente?

Para poder ayudarte, necesitamos que aceptes el tratamiento de tus datos personales según nuestra política de privacidad:

🔗 www.ngsoabogados.com/politica-datos

Por favor selecciona una opción:`;

  const newConfig = {
    message: newMessage,
    variables: [
      {
        name: "company",
        type: "string",
        field: "metadata.compania",
        source: "debtor",
        default: "nuestra empresa"
      }
    ],
    useButtons: true,
    buttonTitle: "Autorizacion",
    buttons: [
      {id: "acepto", text: "Si, acepto", value: "si"},
      {id: "no_acepto", text: "No acepto", value: "no"}
    ]
  };
  
  await c.query("UPDATE bot_nodes SET config=$1 WHERE name=$2", 
    [JSON.stringify(newConfig), "Saludo y Tratamiento de Datos"]);
  
  console.log("Nodo actualizado!");
  console.log(JSON.stringify(newConfig, null, 2));
  
  // También ver la condición
  const cond = await c.query("SELECT name,config FROM bot_nodes WHERE name LIKE '%Validar%'");
  console.log("\nCondicion actual:");
  console.log(JSON.stringify(cond.rows[0], null, 2));
  
  await c.end();
}

main().catch(console.error);
