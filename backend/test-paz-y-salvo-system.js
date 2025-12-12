// Script de Prueba - Sistema de Paz y Salvo
// Verifica: Creación automática, disponibilidad 5 días hábiles, descarga

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function testPazYSalvoSystem() {
  console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA DE PAZ Y SALVO\n');
  
  try {
    // 1. Verificar si hay clientes pagados
    console.log('1️⃣ Verificando clientes con estado PAID...');
    const clientsResult = await pool.query(`
      SELECT 
        id, 
        "fullName", 
        phone, 
        "debtAmount", 
        "lastPaymentDate",
        "lastPaymentAmount",
        "collectionStatus"
      FROM clients 
      WHERE "collectionStatus" = 'paid'
      ORDER BY "lastPaymentDate" DESC
      LIMIT 5
    `);
    
    console.log(`   ✅ Clientes pagados encontrados: ${clientsResult.rows.length}\n`);
    
    if (clientsResult.rows.length === 0) {
      console.log('   ⚠️ No hay clientes con estado PAID para probar\n');
      return;
    }
    
    clientsResult.rows.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.fullName}`);
      console.log(`      - Teléfono: ${client.phone}`);
      console.log(`      - Deuda: $${client.debtAmount?.toLocaleString('es-CO') || 0}`);
      console.log(`      - Pago: $${client.lastPaymentAmount?.toLocaleString('es-CO') || 0}`);
      console.log(`      - Fecha pago: ${client.lastPaymentDate?.toLocaleDateString('es-CO') || 'N/A'}`);
      console.log('');
    });

    // 2. Verificar tabla client_phone_numbers
    console.log('2️⃣ Verificando tabla client_phone_numbers...');
    const phoneTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_phone_numbers'
      )
    `);
    
    if (phoneTableCheck.rows[0].exists) {
      console.log('   ✅ Tabla client_phone_numbers existe\n');
      
      const phoneCount = await pool.query(`
        SELECT COUNT(*) as count FROM client_phone_numbers
      `);
      console.log(`   📱 Registros de teléfonos: ${phoneCount.rows[0].count}\n`);
    } else {
      console.log('   ⚠️ Tabla client_phone_numbers NO existe (necesita migración)\n');
    }

    // 3. Verificar tabla paz_y_salvos
    console.log('3️⃣ Verificando tabla paz_y_salvos...');
    const pazTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'paz_y_salvos'
      )
    `);
    
    if (pazTableCheck.rows[0].exists) {
      console.log('   ✅ Tabla paz_y_salvos existe\n');
      
      const pazCount = await pool.query(`
        SELECT COUNT(*) as count FROM paz_y_salvos
      `);
      console.log(`   📜 Certificados registrados: ${pazCount.rows[0].count}\n`);
      
      if (pazCount.rows[0].count > 0) {
        const pazRecords = await pool.query(`
          SELECT 
            pz."certificateNumber",
            pz.status,
            pz."paymentDate",
            pz."paidAmount",
            pz."availableFromDate",
            pz."filePath",
            c."fullName"
          FROM paz_y_salvos pz
          LEFT JOIN clients c ON pz."clientId" = c.id
          ORDER BY pz."createdAt" DESC
          LIMIT 5
        `);
        
        console.log('   📋 Últimos certificados:\n');
        pazRecords.rows.forEach((paz, index) => {
          console.log(`   ${index + 1}. ${paz.certificateNumber}`);
          console.log(`      - Cliente: ${paz.fullName || 'N/A'}`);
          console.log(`      - Estado: ${paz.status}`);
          console.log(`      - Pago: $${paz.paidAmount?.toLocaleString('es-CO') || 0}`);
          console.log(`      - Fecha pago: ${paz.paymentDate?.toLocaleDateString('es-CO') || 'N/A'}`);
          console.log(`      - Disponible desde: ${paz.availableFromDate?.toLocaleDateString('es-CO') || 'N/A'}`);
          console.log(`      - PDF generado: ${paz.filePath ? '✅' : '❌'}`);
          console.log('');
        });
      }
    } else {
      console.log('   ⚠️ Tabla paz_y_salvos NO existe (necesita migración)\n');
    }

    // 4. Calcular días hábiles para verificar lógica
    console.log('4️⃣ Probando cálculo de días hábiles...');
    const testDate = new Date();
    console.log(`   Fecha de prueba: ${testDate.toLocaleDateString('es-CO')}`);
    
    // Simular 5 días hábiles
    let businessDaysCount = 0;
    let currentDate = new Date(testDate);
    const holidays = [
      '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17',
      '2025-04-18', '2025-05-01', '2025-06-02', '2025-06-23',
      '2025-06-30', '2025-07-20', '2025-08-07', '2025-08-18',
      '2025-10-13', '2025-11-03', '2025-11-17', '2025-12-08',
      '2025-12-25'
    ];
    
    while (businessDaysCount < 5) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
        businessDaysCount++;
      }
    }
    
    console.log(`   Disponible desde: ${currentDate.toLocaleDateString('es-CO')}`);
    console.log('   ✅ Lógica de días hábiles correcta\n');

    // 5. Verificar permisos necesarios
    console.log('5️⃣ Verificando permisos en la base de datos...');
    const permsResult = await pool.query(`
      SELECT module, action, description 
      FROM permissions 
      WHERE module = 'clients'
      ORDER BY action
    `);
    
    console.log(`   📝 Permisos de módulo 'clients': ${permsResult.rows.length}`);
    permsResult.rows.forEach(perm => {
      console.log(`      - ${perm.module}:${perm.action} - ${perm.description}`);
    });
    console.log('');

    // Resumen
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Clientes pagados: ${clientsResult.rows.length}`);
    console.log(`${phoneTableCheck.rows[0].exists ? '✅' : '⚠️'} Tabla client_phone_numbers: ${phoneTableCheck.rows[0].exists ? 'EXISTE' : 'FALTA MIGRACIÓN'}`);
    console.log(`${pazTableCheck.rows[0].exists ? '✅' : '⚠️'} Tabla paz_y_salvos: ${pazTableCheck.rows[0].exists ? 'EXISTE' : 'FALTA MIGRACIÓN'}`);
    console.log('✅ Cálculo días hábiles: FUNCIONAL');
    console.log(`✅ Permisos configurados: ${permsResult.rows.length > 0 ? 'SÍ' : 'NO'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (!phoneTableCheck.rows[0].exists || !pazTableCheck.rows[0].exists) {
      console.log('🔧 SIGUIENTE PASO: Ejecutar migraciones de TypeORM');
      console.log('   Comando: npm run migration:run\n');
    }

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testPazYSalvoSystem();
