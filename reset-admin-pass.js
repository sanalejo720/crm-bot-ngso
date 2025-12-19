const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    database: 'crm_whatsapp',
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    port: 5432,
  });

  await client.connect();
  
  // Generar hash para Admin123!
  const hash = await bcrypt.hash('Admin123!', 10);
  console.log('Hash generado:', hash);
  
  // Actualizar contraseña del admin
  const result = await client.query(
    'UPDATE users SET password = $1 WHERE email = $2 RETURNING email',
    [hash, 'admin@assoftware.xyz']
  );
  
  if (result.rows.length > 0) {
    console.log('✅ Contraseña actualizada para:', result.rows[0].email);
  } else {
    console.log('❌ Usuario no encontrado');
  }
  
  await client.end();
}

main().catch(console.error);
