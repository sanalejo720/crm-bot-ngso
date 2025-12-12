const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

async function createTestDebtors() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creando deudores de prueba...\n');

    // Deudor 1 - Con el teléfono del chat que existe
    const debtor1 = await client.query(`
      INSERT INTO debtors (
        full_name,
        document_type,
        document_number,
        phone,
        email,
        debt_amount,
        days_overdue,
        status,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        'Juan Pérez Gómez',
        'CC',
        '1061749683',
        '573334309474',
        'juan.perez@example.com',
        2500000,
        45,
        'pending',
        '{"producto": "Crédito Personal", "fechaVencimiento": "2024-10-15", "cuotas": 12, "cuotasPendientes": 6}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (document_type, document_number) 
      DO UPDATE SET
        phone = EXCLUDED.phone,
        debt_amount = EXCLUDED.debt_amount,
        days_overdue = EXCLUDED.days_overdue,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `);
    
    console.log('✅ Deudor 1 creado:');
    console.log(`   Nombre: ${debtor1.rows[0].full_name}`);
    console.log(`   Teléfono: ${debtor1.rows[0].phone}`);
    console.log(`   Deuda: $${debtor1.rows[0].debt_amount.toLocaleString('es-CO')}`);
    console.log(`   Días mora: ${debtor1.rows[0].days_overdue}`);
    console.log('');

    // Deudor 2
    const debtor2 = await client.query(`
      INSERT INTO debtors (
        full_name,
        document_type,
        document_number,
        phone,
        email,
        debt_amount,
        days_overdue,
        status,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        'María González López',
        'CC',
        '52345678',
        '573001234567',
        'maria.gonzalez@example.com',
        1800000,
        30,
        'pending',
        '{"producto": "Tarjeta de Crédito", "fechaVencimiento": "2024-11-01", "cuotas": 24, "cuotasPendientes": 8}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (document_type, document_number) 
      DO UPDATE SET
        phone = EXCLUDED.phone,
        debt_amount = EXCLUDED.debt_amount,
        days_overdue = EXCLUDED.days_overdue,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `);
    
    console.log('✅ Deudor 2 creado:');
    console.log(`   Nombre: ${debtor2.rows[0].full_name}`);
    console.log(`   Teléfono: ${debtor2.rows[0].phone}`);
    console.log(`   Deuda: $${debtor2.rows[0].debt_amount.toLocaleString('es-CO')}`);
    console.log('');

    // Deudor 3 - Con número de prueba WhatsApp
    const debtor3 = await client.query(`
      INSERT INTO debtors (
        full_name,
        document_type,
        document_number,
        phone,
        email,
        debt_amount,
        days_overdue,
        status,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        'Carlos Ramírez Sánchez',
        'CC',
        '79876543',
        '14695720206',
        'carlos.ramirez@example.com',
        3200000,
        60,
        'pending',
        '{"producto": "Crédito Hipotecario", "fechaVencimiento": "2024-09-20", "cuotas": 36, "cuotasPendientes": 12}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (document_type, document_number) 
      DO UPDATE SET
        phone = EXCLUDED.phone,
        debt_amount = EXCLUDED.debt_amount,
        days_overdue = EXCLUDED.days_overdue,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `);
    
    console.log('✅ Deudor 3 creado:');
    console.log(`   Nombre: ${debtor3.rows[0].full_name}`);
    console.log(`   Teléfono: ${debtor3.rows[0].phone}`);
    console.log(`   Deuda: $${debtor3.rows[0].debt_amount.toLocaleString('es-CO')}`);
    console.log('');

    // Verificar total
    const total = await client.query('SELECT COUNT(*) as total FROM debtors');
    console.log(`\n✨ Total deudores en BD: ${total.rows[0].total}`);
    
    console.log('\n🎉 Deudores de prueba creados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestDebtors();
