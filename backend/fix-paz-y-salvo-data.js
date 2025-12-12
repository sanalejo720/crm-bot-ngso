// Script para actualizar registros existentes de paz y salvo
// Genera certificateNumber para registros que no lo tienen

const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

function generateCertificateNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `PYS-${timestamp.slice(-8)}${random}`;
}

async function main() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Verificar si la tabla existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'paz_y_salvos'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('⚠️  La tabla paz_y_salvos no existe, creándola...');
      
      // Crear la tabla
      await client.query(`
        CREATE TABLE IF NOT EXISTS paz_y_salvos (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "certificateNumber" VARCHAR NOT NULL,
          "clientId" UUID NOT NULL,
          "paymentDate" TIMESTAMP NOT NULL DEFAULT NOW(),
          "paidAmount" NUMERIC(10, 2) NOT NULL DEFAULT 0,
          "availableFromDate" TIMESTAMP NOT NULL DEFAULT NOW(),
          status VARCHAR NOT NULL DEFAULT 'pending',
          "filePath" VARCHAR,
          "generatedBy" VARCHAR,
          "downloadedBy" VARCHAR,
          "downloadedAt" TIMESTAMP,
          metadata JSONB,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT "UQ_certificate_number" UNIQUE ("certificateNumber")
        );
      `);
      
      console.log('✅ Tabla paz_y_salvos creada');
    }

    // Verificar registros sin certificateNumber
    const nullCerts = await client.query(`
      SELECT id FROM paz_y_salvos WHERE "certificateNumber" IS NULL;
    `);

    if (nullCerts.rows.length === 0) {
      console.log('✅ No hay registros sin certificateNumber');
    } else {
      console.log(`🔧 Actualizando ${nullCerts.rows.length} registros sin certificateNumber...`);
      
      for (const row of nullCerts.rows) {
        const certNumber = generateCertificateNumber();
        await client.query(
          `UPDATE paz_y_salvos SET "certificateNumber" = $1 WHERE id = $2`,
          [certNumber, row.id]
        );
        console.log(`  ✓ Actualizado ID ${row.id} -> ${certNumber}`);
        
        // Pequeño delay para evitar certificados duplicados
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log('✅ Todos los registros actualizados');
    }

    // Verificar constraint
    const hasConstraint = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'paz_y_salvos' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name = 'UQ_certificate_number';
    `);

    if (hasConstraint.rows.length === 0) {
      console.log('🔧 Agregando constraint UNIQUE a certificateNumber...');
      await client.query(`
        ALTER TABLE paz_y_salvos 
        ADD CONSTRAINT "UQ_certificate_number" UNIQUE ("certificateNumber");
      `);
      console.log('✅ Constraint agregado');
    }

    // Mostrar estado final
    const finalState = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT("certificateNumber") as with_cert
      FROM paz_y_salvos;
    `);

    console.log('\n📊 Estado final:');
    console.log(`   Total registros: ${finalState.rows[0].total}`);
    console.log(`   Con certificateNumber: ${finalState.rows[0].with_cert}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
