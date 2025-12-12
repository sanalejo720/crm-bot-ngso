const axios = require('axios');

const API_URL = 'https://ngso-chat.assoftware.xyz/api/v1';

async function createTestDebtors() {
  try {
    // 1. Login como admin
    console.log('🔐 Iniciando sesión...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@assoftware.xyz',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Sesión iniciada\n');

    const headers = { Authorization: `Bearer ${token}` };

    // Deudor 1 - Con el teléfono del chat que existe (573334309474)
    console.log('📝 Creando Deudor 1 (Juan Pérez)...');
    try {
      const debtor1 = await axios.post(`${API_URL}/debtors`, {
        fullName: 'Juan Pérez Gómez',
        documentType: 'CC',
        documentNumber: '1061749683',
        phone: '573334309474',
        email: 'juan.perez@example.com',
        debtAmount: 2500000,
        initialDebtAmount: 3000000,
        daysOverdue: 45,
        status: 'pending',
        metadata: {
          producto: 'Crédito Personal',
          fechaVencimiento: '2024-10-15',
          cuotas: 12,
          cuotasPendientes: 6
        }
      }, { headers });
      
      console.log('✅ Deudor 1 creado:');
      console.log(`   ID: ${debtor1.data.data.id}`);
      console.log(`   Nombre: ${debtor1.data.data.fullName}`);
      console.log(`   Teléfono: ${debtor1.data.data.phone}`);
      console.log(`   Deuda: $${debtor1.data.data.debtAmount.toLocaleString('es-CO')}`);
      console.log('');
    } catch (err) {
      if (err.response?.status === 409) {
        console.log('⚠️  Deudor 1 ya existe (actualizando...)');
        // Buscar y actualizar
        const search = await axios.get(`${API_URL}/debtors?phone=573334309474`, { headers });
        if (search.data.data.length > 0) {
          const debtorId = search.data.data[0].id;
          await axios.patch(`${API_URL}/debtors/${debtorId}`, {
            debtAmount: 2500000,
            daysOverdue: 45,
            metadata: {
              producto: 'Crédito Personal',
              fechaVencimiento: '2024-10-15',
              cuotas: 12,
              cuotasPendientes: 6
            }
          }, { headers });
          console.log('✅ Deudor 1 actualizado\n');
        }
      } else {
        console.error('❌ Error creando Deudor 1:', err.response?.data || err.message);
      }
    }

    // Deudor 2
    console.log('📝 Creando Deudor 2 (María González)...');
    try {
      const debtor2 = await axios.post(`${API_URL}/debtors`, {
        fullName: 'María González López',
        documentType: 'CC',
        documentNumber: '52345678',
        phone: '573001234567',
        email: 'maria.gonzalez@example.com',
        debtAmount: 1800000,
        initialDebtAmount: 2400000,
        daysOverdue: 30,
        status: 'pending',
        metadata: {
          producto: 'Tarjeta de Crédito',
          fechaVencimiento: '2024-11-01',
          cuotas: 24,
          cuotasPendientes: 8
        }
      }, { headers });
      
      console.log('✅ Deudor 2 creado:');
      console.log(`   Nombre: ${debtor2.data.data.fullName}`);
      console.log(`   Teléfono: ${debtor2.data.data.phone}`);
      console.log(`   Deuda: $${debtor2.data.data.debtAmount.toLocaleString('es-CO')}`);
      console.log('');
    } catch (err) {
      if (err.response?.status === 409) {
        console.log('⚠️  Deudor 2 ya existe\n');
      } else {
        console.error('❌ Error creando Deudor 2:', err.response?.data || err.message);
      }
    }

    // Deudor 3 - Con número WhatsApp de prueba
    console.log('📝 Creando Deudor 3 (Carlos Ramírez)...');
    try {
      const debtor3 = await axios.post(`${API_URL}/debtors`, {
        fullName: 'Carlos Ramírez Sánchez',
        documentType: 'CC',
        documentNumber: '79876543',
        phone: '14695720206',
        email: 'carlos.ramirez@example.com',
        debtAmount: 3200000,
        initialDebtAmount: 4000000,
        daysOverdue: 60,
        status: 'pending',
        metadata: {
          producto: 'Crédito Hipotecario',
          fechaVencimiento: '2024-09-20',
          cuotas: 36,
          cuotasPendientes: 12
        }
      }, { headers });
      
      console.log('✅ Deudor 3 creado:');
      console.log(`   Nombre: ${debtor3.data.data.fullName}`);
      console.log(`   Teléfono: ${debtor3.data.data.phone}`);
      console.log(`   Deuda: $${debtor3.data.data.debtAmount.toLocaleString('es-CO')}`);
      console.log('');
    } catch (err) {
      if (err.response?.status === 409) {
        console.log('⚠️  Deudor 3 ya existe\n');
      } else {
        console.error('❌ Error creando Deudor 3:', err.response?.data || err.message);
      }
    }

    // Listar todos los deudores
    console.log('📊 Verificando deudores creados...');
    const allDebtors = await axios.get(`${API_URL}/debtors`, { headers });
    console.log(`\n✨ Total deudores en BD: ${allDebtors.data.data.length}`);
    
    console.log('\n🎉 ¡Deudores de prueba creados exitosamente!');
    console.log('\n📱 Ahora puedes:');
    console.log('   1. Enviar mensaje al 573334309474 desde WhatsApp');
    console.log('   2. El bot detectará los datos de Juan Pérez');
    console.log('   3. Las variables se reemplazarán correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

createTestDebtors();
