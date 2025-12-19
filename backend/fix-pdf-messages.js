const { Client } = require('pg');

const client = new Client({
  user: 'crm_admin',
  host: 'localhost',
  database: 'crm_whatsapp',
  password: 'CRM_NgsoPass2024!',
  port: 5432,
});

async function fixPdfMessages() {
  await client.connect();
  
  console.log('🔍 Buscando mensajes con PDFs...\n');
  
  // 1. Buscar mensajes que tengan mediaUrl con .pdf pero type diferente a 'document'
  const findQuery = `
    SELECT id, "chatId", "mediaUrl", "mediaFileName", "mediaMimeType", type, "createdAt"
    FROM messages
    WHERE ("mediaFileName" LIKE '%.pdf' OR "mediaMimeType" = 'application/pdf')
    AND type != 'document'
    ORDER BY "createdAt" DESC
    LIMIT 20;
  `;
  
  const result = await client.query(findQuery);
  
  if (result.rows.length === 0) {
    console.log('✅ No se encontraron mensajes PDF con tipo incorrecto\n');
  } else {
    console.log(`📄 Se encontraron ${result.rows.length} mensajes PDF con tipo incorrecto:\n`);
    console.table(result.rows);
    
    // 2. Actualizar el tipo a 'document'
    const updateQuery = `
      UPDATE messages
      SET type = 'document'
      WHERE ("mediaFileName" LIKE '%.pdf' OR "mediaMimeType" = 'application/pdf')
      AND type != 'document';
    `;
    
    const updateResult = await client.query(updateQuery);
    console.log(`\n✅ Se actualizaron ${updateResult.rowCount} mensajes a type='document'\n`);
  }
  
  // 3. Verificar mensajes PDF del número específico
  console.log('\n🔍 Verificando mensajes del chat 573134956224...\n');
  
  const chatQuery = `
    SELECT m.id, m.content, m.type, m."mediaUrl", m."mediaFileName", m."mediaMimeType", m."createdAt"
    FROM messages m
    JOIN chats c ON m."chatId" = c.id
    WHERE c."contactPhone" LIKE '%3134956224%'
    ORDER BY m."createdAt" DESC
    LIMIT 10;
  `;
  
  const chatResult = await client.query(chatQuery);
  
  if (chatResult.rows.length === 0) {
    console.log('⚠️ No se encontraron mensajes para ese chat\n');
  } else {
    console.log(`📱 Mensajes del chat:\n`);
    console.table(chatResult.rows);
  }

  // 4. Buscar a qué chat pertenece el PDF más reciente
  console.log('\n🔍 Buscando a qué chat pertenece el PDF 1766097993861_MM0058c21b.pdf...\n');
  
  const pdfOwnerQuery = `
    SELECT m.id, c."contactPhone", c."contactName", m.type, m."mediaFileName", m."createdAt"
    FROM messages m
    JOIN chats c ON m."chatId" = c.id
    WHERE m."mediaFileName" = '1766097993861_MM0058c21b.pdf';
  `;
  
  const pdfOwnerResult = await client.query(pdfOwnerQuery);
  
  if (pdfOwnerResult.rows.length === 0) {
    console.log('⚠️ No se encontró el mensaje con ese PDF en la BD\n');
  } else {
    console.log(`📄 Información del PDF:\n`);
    console.table(pdfOwnerResult.rows);
  }
  
  await client.end();
  console.log('\n✅ Script completado\n');
}

fixPdfMessages().catch(err => {
  console.error('❌ Error:', err);
  client.end();
});
