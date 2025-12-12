// Script: Crear Paz y Salvos para clientes pagados
// Genera automáticamente certificados para clientes existentes con estado PAID

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

function calculateBusinessDays(startDate, daysToAdd) {
  const holidays = [
    '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17',
    '2025-04-18', '2025-05-01', '2025-06-02', '2025-06-23',
    '2025-06-30', '2025-07-20', '2025-08-07', '2025-08-18',
    '2025-10-13', '2025-11-03', '2025-11-17', '2025-12-08',
    '2025-12-25'
  ];

  let businessDaysCount = 0;
  let currentDate = new Date(startDate);

  while (businessDaysCount < daysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split('T')[0];

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
      businessDaysCount++;
    }
  }

  return currentDate;
}

function generateCertificateNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PYS-${timestamp.slice(-8)}${random}`;
}

async function createPazYSalvos() {
  console.log('📜 Creando Paz y Salvos para clientes pagados...\n');

  try {
    // Obtener clientes pagados sin paz y salvo
    const clientsResult = await pool.query(`
      SELECT 
        c.id,
        c."fullName",
        c.phone,
        c."debtAmount",
        c."lastPaymentDate",
        c."lastPaymentAmount"
      FROM clients c
      LEFT JOIN paz_y_salvos pz ON pz."clientId" = c.id
      WHERE c."collectionStatus" = 'paid'
        AND pz.id IS NULL
        AND c."lastPaymentDate" IS NOT NULL
      ORDER BY c."lastPaymentDate" DESC
    `);

    console.log(`✅ Clientes pagados sin paz y salvo: ${clientsResult.rows.length}\n`);

    if (clientsResult.rows.length === 0) {
      console.log('ℹ️ No hay clientes que necesiten paz y salvo\n');
      return;
    }

    // Crear paz y salvo para cada cliente
    for (const client of clientsResult.rows) {
      const certificateNumber = generateCertificateNumber();
      const paymentDate = new Date(client.lastPaymentDate);
      const availableFromDate = calculateBusinessDays(paymentDate, 5);
      const today = new Date();
      
      // Determinar estado basado en fecha de disponibilidad
      let status = 'pending';
      if (today >= availableFromDate) {
        status = 'available';
      }

      await pool.query(`
        INSERT INTO paz_y_salvos (
          "certificateNumber",
          "clientId",
          "paymentDate",
          "paidAmount",
          "availableFromDate",
          status,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        certificateNumber,
        client.id,
        paymentDate,
        client.lastPaymentAmount || client.debtAmount || 0,
        availableFromDate,
        status,
        JSON.stringify({
          originalDebtAmount: client.debtAmount,
          createdBy: 'system-migration'
        })
      ]);

      console.log(`✅ ${client.fullName}`);
      console.log(`   - Certificado: ${certificateNumber}`);
      console.log(`   - Pago: $${(client.lastPaymentAmount || 0).toLocaleString('es-CO')}`);
      console.log(`   - Fecha pago: ${paymentDate.toLocaleDateString('es-CO')}`);
      console.log(`   - Disponible desde: ${availableFromDate.toLocaleDateString('es-CO')}`);
      console.log(`   - Estado: ${status === 'available' ? '🟢 DISPONIBLE' : '🟡 PENDIENTE'}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Paz y salvos creados exitosamente');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error creando paz y salvos:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

createPazYSalvos();
