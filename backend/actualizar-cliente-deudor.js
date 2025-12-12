const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function actualizarClienteConDeudor() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Actualizando cliente con datos del deudor...\n');

    // Obtener datos del deudor
    const debtorResult = await client.query(`
      SELECT id, "fullName", phone, email, "debtAmount", "daysOverdue", "documentType", "documentNumber", status, metadata
      FROM debtors 
      WHERE phone = '573334309474'
    `);

    if (debtorResult.rows.length === 0) {
      console.log('❌ Deudor no encontrado');
      return;
    }

    const debtor = debtorResult.rows[0];
    console.log(`✅ Deudor encontrado: ${debtor.fullName}`);

    // Separar nombre
    const nameParts = debtor.fullName.split(' ');
    const firstName = nameParts[0] || debtor.fullName;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Actualizar cliente con campos de deuda directos
    const updateResult = await client.query(`
      UPDATE clients
      SET 
        "fullName" = $1,
        phone = $2,
        email = $3,
        company = $4,
        tags = $5,
        "debtAmount" = $6,
        "daysOverdue" = $7,
        "documentNumber" = $8,
        "collectionStatus" = $9,
        "customFields" = $10,
        "updatedAt" = NOW()
      WHERE phone LIKE $11
      RETURNING id, "fullName", phone, email, company, tags, "debtAmount", "daysOverdue", "documentNumber", "collectionStatus", "customFields"
    `, [
      debtor.fullName,
      '573334309474@c.us',  // Mantener formato de WhatsApp
      debtor.email,
      debtor.metadata?.producto || debtor.metadata?.compania || null,
      ['deudor', debtor.status],
      parseFloat(debtor.debtAmount),  // debtAmount directo
      parseInt(debtor.daysOverdue),   // daysOverdue directo
      debtor.documentNumber,          // documentNumber directo
      debtor.status || 'pending',     // collectionStatus
      {
        debtorId: debtor.id,
        documentType: debtor.documentType,
        producto: debtor.metadata?.producto,
        originalData: debtor.metadata
      },
      '%3334309474%'  // WHERE phone LIKE
    ]);

    if (updateResult.rows.length > 0) {
      const updated = updateResult.rows[0];
      console.log('\n✅ Cliente actualizado:');
      console.log(`   ID: ${updated.id}`);
      console.log(`   Nombre: ${updated.fullName}`);
      console.log(`   Teléfono: ${updated.phone}`);
      console.log(`   Email: ${updated.email || 'NULL'}`);
      console.log(`   Empresa: ${updated.company || 'NULL'}`);
      console.log(`   Deuda: $${updated.debtAmount}`);
      console.log(`   Días de mora: ${updated.daysOverdue}`);
      console.log(`   Documento: ${updated.documentNumber}`);
      console.log(`   Estado cobro: ${updated.collectionStatus}`);
      console.log(`   Tags: ${JSON.stringify(updated.tags)}`);
      console.log(`   Custom Fields: ${JSON.stringify(updated.customFields)}`);
    } else {
      console.log('⚠️ No se encontró el cliente para actualizar');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

actualizarClienteConDeudor();
