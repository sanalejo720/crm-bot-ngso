const { Client } = require('pg');
const axios = require('axios');

const client = new Client({
  user: 'crm_admin',
  host: 'localhost',
  database: 'crm_whatsapp',
  password: 'CRM_NgsoPass2024!',
  port: 5432,
});

// Credenciales para API (obtener token)
const API_URL = 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = 'admin@assoftware.xyz';
const ADMIN_PASSWORD = 'password123';

async function createChatsFromAssignments() {
  await client.connect();
  console.log('✅ Conectado a la base de datos\n');

  // 1. Login para obtener token
  console.log('🔐 Autenticando...');
  const loginResponse = await axios.post(`${API_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = loginResponse.data.data.accessToken;
  console.log('✅ Autenticado\n');

  // 2. Obtener todas las asignaciones pendientes que no tienen chat asociado
  console.log('📋 Buscando asignaciones pendientes sin chat...\n');
  
  const query = `
    SELECT 
      pa.id,
      pa.phone,
      pa.agent_email,
      pa.campaign_name,
      pa.template_sid,
      pa.created_at,
      pa.assigned
    FROM pending_agent_assignments pa
    WHERE NOT EXISTS (
      SELECT 1 FROM chats c 
      WHERE c."contactPhone" = pa.phone 
      AND c.metadata->>'source' = 'mass_campaign'
      AND c.metadata->>'campaignName' = pa.campaign_name
    )
    ORDER BY pa.created_at DESC;
  `;

  const result = await client.query(query);
  console.log(`📊 Encontradas ${result.rows.length} asignaciones sin chat\n`);

  if (result.rows.length === 0) {
    console.log('✅ No hay asignaciones pendientes sin chat');
    await client.end();
    return;
  }

  // 3. Obtener campaña activa y número de WhatsApp
  const campaignsQuery = `SELECT id, name FROM campaigns WHERE status = 'active' LIMIT 1`;
  const campaignsResult = await client.query(campaignsQuery);
  
  if (campaignsResult.rows.length === 0) {
    console.error('❌ No hay campañas activas. Crea una campaña primero.');
    await client.end();
    return;
  }

  const campaign = campaignsResult.rows[0];
  console.log(`📋 Usando campaña: ${campaign.name} (${campaign.id})\n`);

  const whatsappQuery = `SELECT id, "phoneNumber" FROM whatsapp_numbers WHERE "isActive" = true LIMIT 1`;
  const whatsappResult = await client.query(whatsappQuery);
  
  if (whatsappResult.rows.length === 0) {
    console.error('❌ No hay números de WhatsApp activos');
    await client.end();
    return;
  }

  const whatsappNumber = whatsappResult.rows[0];
  console.log(`📞 Usando número WhatsApp: ${whatsappNumber.phoneNumber}\n`);

  // 4. Crear chats para cada asignación
  let created = 0;
  let errors = 0;
  const batchSize = 50;

  console.log(`🚀 Creando chats en lotes de ${batchSize}...\n`);

  for (let i = 0; i < result.rows.length; i += batchSize) {
    const batch = result.rows.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(result.rows.length / batchSize);

    console.log(`📦 Lote ${batchNum}/${totalBatches} (${batch.length} chats)`);

    await Promise.all(
      batch.map(async (assignment, idx) => {
        try {
          const externalId = `retroactive_${assignment.campaign_name || 'unknown'}_${assignment.phone.replace(/\+/g, '')}_${Date.now()}_${idx}`;
          
          const chatData = {
            externalId,
            contactPhone: assignment.phone,
            contactName: assignment.phone,
            campaignId: campaign.id,
            whatsappNumberId: whatsappNumber.id,
            metadata: {
              source: 'mass_campaign',
              campaignName: assignment.campaign_name || 'Campaña sin nombre',
              templateSid: assignment.template_sid,
              sentAt: assignment.created_at,
              agentEmail: assignment.agent_email,
              retroactive: true,
              retroactiveDate: new Date().toISOString(),
            },
          };

          // Crear chat vía API
          await axios.post(`${API_URL}/chats`, chatData, {
            headers: { Authorization: `Bearer ${token}` },
          });

          created++;
          const msgNum = i + idx + 1;
          console.log(`   ✅ [${msgNum}/${result.rows.length}] Chat creado: ${assignment.phone}`);
        } catch (error) {
          errors++;
          const msgNum = i + idx + 1;
          const errorMsg = error.response?.data?.message || error.message;
          
          // Si es "ya existe", no es error
          if (errorMsg.includes('ya existe')) {
            console.log(`   ℹ️  [${msgNum}/${result.rows.length}] ${assignment.phone} - Ya existe`);
          } else {
            console.error(`   ❌ [${msgNum}/${result.rows.length}] ${assignment.phone} - ERROR: ${errorMsg}`);
          }
        }
      })
    );

    // Pequeño delay entre lotes
    if (i + batchSize < result.rows.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ PROCESO COMPLETADO');
  console.log(`   📊 Total procesadas: ${result.rows.length}`);
  console.log(`   ✅ Chats creados: ${created}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await client.end();
}

createChatsFromAssignments().catch((err) => {
  console.error('❌ Error fatal:', err);
  client.end();
  process.exit(1);
});
