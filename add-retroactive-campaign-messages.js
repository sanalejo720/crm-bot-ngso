/**
 * Script para agregar mensajes retroactivos de la campaña masiva
 * Template: vigente_aviso_2 (HX0bb45dfd6b84d0c66db9b684035c74b1)
 */

const axios = require('axios');

const API_URL = 'http://72.61.73.9:3000';
const ADMIN_EMAIL = 'admin@assoftware.xyz';
const ADMIN_PASSWORD = 'Camilo1234@';

// Template content (con placeholders genéricos)
const TEMPLATE_CONTENT = `Cordial saludo,

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que presenta un saldo pendiente de más de 30 días en el pago de los cánones de su contrato de arrendamiento.

📋 Solicitud pendiente de revisión

Es importante regularizar su situación para evitar inconvenientes. Le invitamos a solicitar su link de pago en los próximos 5 días respondiendo a este mensaje.

Atentamente,
NGS&O Abogados`;

let authToken = null;

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    authToken = response.data.access_token;
    console.log('✅ Login exitoso');
    return authToken;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    throw error;
  }
}

async function getCampaignChatsWithoutMessages(page = 1, limit = 100) {
  try {
    const response = await axios.get(`${API_URL}/chats/mass-campaigns`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo chats:', error.response?.data || error.message);
    throw error;
  }
}

async function createRetroactiveMessage(chatId, sentAt) {
  try {
    // Crear el mensaje directamente en la base de datos usando el endpoint interno
    const response = await axios.post(
      `${API_URL}/messages`,
      {
        chatId: chatId,
        content: TEMPLATE_CONTENT,
        direction: 'outbound',
        senderType: 'system',
        status: 'sent',
        createdAt: sentAt, // Usar la fecha original del envío
        metadata: {
          source: 'retroactive_campaign',
          templateSid: 'HX0bb45dfd6b84d0c66db9b684035c74b1',
          templateName: 'vigente_aviso_2',
          note: 'Mensaje agregado retroactivamente desde campaña masiva'
        }
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Error creando mensaje para chat ${chatId}:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Iniciando creación de mensajes retroactivos de campaña masiva...\n');
  
  await login();
  
  let page = 1;
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalErrors = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`\n📄 Procesando página ${page}...`);
    
    const result = await getCampaignChatsWithoutMessages(page, 100);
    const chats = Array.isArray(result) ? result : (result.data || []);
    
    if (chats.length === 0) {
      hasMore = false;
      break;
    }

    // Procesar en lotes de 20
    const batchSize = 20;
    for (let i = 0; i < chats.length; i += batchSize) {
      const batch = chats.slice(i, i + batchSize);
      
      console.log(`  Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(chats.length / batchSize)}...`);
      
      const promises = batch.map(async (chat) => {
        totalProcessed++;
        
        // Solo crear mensaje si el chat no tiene mensajes
        if (!chat.messages || chat.messages.length === 0) {
          // Usar la fecha de envío del metadata
          const sentAt = chat.metadata?.sentAt || chat.createdAt;
          const result = await createRetroactiveMessage(chat.id, sentAt);
          
          if (result) {
            totalCreated++;
            return { success: true, chatId: chat.id };
          } else {
            totalErrors++;
            return { success: false, chatId: chat.id };
          }
        } else {
          console.log(`  ⏭️  Chat ${chat.id} ya tiene mensajes, omitiendo...`);
          return { success: false, chatId: chat.id, reason: 'already_has_messages' };
        }
      });
      
      await Promise.all(promises);
      
      // Pequeña pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`  ✅ Página ${page} completada: ${chats.length} chats procesados`);
    console.log(`  📊 Total acumulado: ${totalCreated} mensajes creados, ${totalErrors} errores`);
    
    page++;
    
    // Si obtuvimos menos de 100, ya no hay más páginas
    if (chats.length < 100) {
      hasMore = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN FINAL:');
  console.log('='.repeat(60));
  console.log(`Total de chats procesados: ${totalProcessed}`);
  console.log(`Mensajes creados exitosamente: ${totalCreated}`);
  console.log(`Errores encontrados: ${totalErrors}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
