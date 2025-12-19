const xlsx = require('xlsx');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const client = new Client({
    host: 'localhost',
    database: 'crm_whatsapp',
    user: 'crm_admin',
    password: 'NGSOAdmin2025!',
    port: 5432,
  });

  await client.connect();
  console.log('Conectado a la base de datos');

  // Obtener el rol de agente
  const roleResult = await client.query("SELECT id FROM roles WHERE name = 'agent'");
  if (roleResult.rows.length === 0) {
    console.error('No se encontró el rol "agent"');
    await client.end();
    return;
  }
  const agentRoleId = roleResult.rows[0].id;
  console.log('Rol agent:', agentRoleId);

  // Obtener campañas
  const campaignsResult = await client.query('SELECT id, name FROM campaigns');
  const campaigns = {};
  campaignsResult.rows.forEach(c => {
    campaigns[c.name.toUpperCase()] = c.id;
  });
  console.log('Campañas encontradas:', Object.keys(campaigns));

  // Cargar ASESORES.xlsx
  const wb = xlsx.readFile('/tmp/ASESORES.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  console.log('\n=== CREANDO/ACTUALIZANDO AGENTES ===');
  
  const agentMapping = {}; // fullName -> id
  
  for (const row of data) {
    const nombres = (row['Nombres'] || '').trim();
    const apellidos = (row['Apellidos'] || '').trim();
    const cedula = (row['Cédula'] || '').toString().trim();
    const campana = (row['Campaña'] || '').trim().toUpperCase();
    const correo = (row['Correo'] || '').trim();
    const password = (row['Contraseña'] || '').toString().trim();
    
    if (!nombres || !apellidos) continue;
    
    const fullName = `${nombres} ${apellidos}`.toUpperCase();
    const username = correo.split('@')[0] || fullName.toLowerCase().replace(/\s+/g, '.');
    
    // Buscar campaña
    let campaignId = null;
    for (const [campName, campId] of Object.entries(campaigns)) {
      if (campName.includes(campana) || campana.includes(campName)) {
        campaignId = campId;
        break;
      }
    }
    
    // Verificar si ya existe
    const existingUser = await client.query(
      'SELECT id FROM users WHERE "documentNumber" = $1 OR email = $2',
      [cedula, correo]
    );
    
    if (existingUser.rows.length > 0) {
      const userId = existingUser.rows[0].id;
      agentMapping[fullName] = userId;
      // También mapear solo nombres y solo apellidos para coincidencias parciales
      agentMapping[nombres.toUpperCase()] = userId;
      console.log(`  ⏭ Ya existe: ${fullName} (${userId})`);
      continue;
    }
    
    // Crear hash de contraseña
    const hashedPassword = await bcrypt.hash(password || 'Temp1234!', 10);
    
    // Insertar usuario
    try {
      const insertResult = await client.query(`
        INSERT INTO users (
          username, email, password, "fullName", "roleId", "isActive",
          "documentType", "documentNumber", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, true, 'CC', $6, NOW(), NOW())
        RETURNING id
      `, [username, correo, hashedPassword, fullName, agentRoleId, cedula]);
      
      const userId = insertResult.rows[0].id;
      agentMapping[fullName] = userId;
      agentMapping[nombres.toUpperCase()] = userId;
      
      // Asignar a campaña si existe
      if (campaignId) {
        await client.query(`
          INSERT INTO user_campaigns ("userId", "campaignId")
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [userId, campaignId]);
      }
      
      console.log(`  ✅ Creado: ${fullName} -> ${correo} (Campaña: ${campana || 'N/A'})`);
    } catch (err) {
      console.error(`  ❌ Error creando ${fullName}:`, err.message);
    }
  }

  // Crear mapeo para coincidencias parciales
  console.log('\n=== MAPEO DE NOMBRES ===');
  const nameMapping = {};
  
  // Agregar asesores conocidos con sus variantes
  for (const [fullName, userId] of Object.entries(agentMapping)) {
    nameMapping[fullName] = userId;
    
    // Agregar variantes: APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2
    const parts = fullName.split(' ');
    if (parts.length >= 3) {
      // Invertir orden (apellidos primero)
      const inverted = [...parts.slice(-2), ...parts.slice(0, -2)].join(' ');
      nameMapping[inverted] = userId;
    }
  }
  
  console.log('Total mapeos:', Object.keys(nameMapping).length);
  
  // Guardar mapeo para uso posterior
  const fs = require('fs');
  fs.writeFileSync('/tmp/agent-mapping.json', JSON.stringify(nameMapping, null, 2));
  console.log('Mapeo guardado en /tmp/agent-mapping.json');

  await client.end();
  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
