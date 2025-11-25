// Script para crear deudores directamente via API (sin CSV)
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';
let authToken = '';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const deudores = [
  {
    fullName: 'Carlos Morales Rodriguez',
    documentType: 'CC',
    documentNumber: '1234567890',
    phone: '3001112233',
    email: 'carlos.morales@email.com',
    address: 'Calle 123 #45-67 Bogotá',
    debtAmount: 1500000,
    initialDebtAmount: 2000000,
    daysOverdue: 45,
    lastPaymentDate: '2024-10-01',
    promiseDate: '2025-12-15',
    status: 'active',
    notes: 'Cliente con historial de mora',
    metadata: {
      producto: 'Crédito Personal',
      numeroCredito: 'CRE-2024-001',
      fechaVencimiento: '2024-12-31',
    },
  },
  {
    fullName: 'Maria Fernanda Lopez',
    documentType: 'CC',
    documentNumber: '9876543210',
    phone: '3147512827',
    email: 'maria.lopez@email.com',
    address: 'Carrera 45 #12-34 Medellín',
    debtAmount: 2500000,
    initialDebtAmount: 3000000,
    daysOverdue: 60,
    lastPaymentDate: '2024-09-15',
    status: 'active',
    notes: 'Deudor con varios intentos de contacto',
    metadata: {
      producto: 'Crédito Comercial',
      numeroCredito: 'CRE-2024-002',
      fechaVencimiento: '2024-11-30',
    },
  },
  {
    fullName: 'Juan Pablo Ramirez',
    documentType: 'CC',
    documentNumber: '5555666677',
    phone: '3201234567',
    email: 'juan.ramirez@email.com',
    address: 'Avenida 80 #50-25 Cali',
    debtAmount: 800000,
    initialDebtAmount: 1000000,
    daysOverdue: 30,
    lastPaymentDate: '2024-10-20',
    promiseDate: '2025-11-30',
    status: 'negotiating',
    notes: 'Cliente en proceso de acuerdo',
    metadata: {
      producto: 'Crédito Vehículo',
      numeroCredito: 'CRE-2024-003',
      fechaVencimiento: '2025-01-15',
    },
  },
  {
    fullName: 'Ana Sofia Martinez',
    documentType: 'CE',
    documentNumber: '1122334455',
    phone: '3109876543',
    email: 'ana.martinez@email.com',
    address: 'Diagonal 30 #15-40 Barranquilla',
    debtAmount: 3200000,
    initialDebtAmount: 4000000,
    daysOverdue: 90,
    lastPaymentDate: '2024-07-30',
    status: 'defaulted',
    notes: 'Cliente en mora avanzada',
    metadata: {
      producto: 'Crédito Hipotecario',
      numeroCredito: 'CRE-2024-004',
      fechaVencimiento: '2024-10-31',
    },
  },
  {
    fullName: 'Pedro Luis Gomez',
    documentType: 'CC',
    documentNumber: '7788990011',
    phone: '3156789012',
    email: 'pedro.gomez@email.com',
    address: 'Transversal 25 #8-60 Bucaramanga',
    debtAmount: 1200000,
    initialDebtAmount: 1500000,
    daysOverdue: 20,
    lastPaymentDate: '2024-11-01',
    promiseDate: '2025-12-01',
    status: 'active',
    notes: 'Buen historial de pago',
    metadata: {
      producto: 'Crédito Consumo',
      numeroCredito: 'CRE-2024-005',
      fechaVencimiento: '2025-02-28',
    },
  },
];

async function login() {
  log('\n1. AUTENTICACIÓN', 'cyan');
  log('='.repeat(50), 'cyan');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crm.com',
      password: 'password123',
    });
    
    authToken = response.data.data.accessToken;
    log('✓ Login exitoso', 'green');
    return true;
  } catch (error) {
    log(`✗ Error en login: ${error.message}`, 'red');
    return false;
  }
}

async function createDebtors() {
  log('\n2. CREAR DEUDORES UNO POR UNO', 'cyan');
  log('='.repeat(50), 'cyan');
  
  let created = 0;
  let skipped = 0;
  
  for (const debtor of deudores) {
    try {
      const response = await axios.post(
        `${API_URL}/debtors`,
        debtor,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      
      log(`✓ Creado: ${debtor.fullName}`, 'green');
      created++;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Ya existe')) {
        log(`⏭️  Ya existe: ${debtor.fullName}`, 'yellow');
        skipped++;
      } else {
        log(`✗ Error: ${debtor.fullName} - ${error.message}`, 'red');
      }
    }
  }
  
  log('', '');
  log(`Resumen: ${created} creados, ${skipped} ya existían`, 'cyan');
  return true;
}

async function listDebtors() {
  log('\n3. LISTAR DEUDORES', 'cyan');
  log('='.repeat(50), 'cyan');
  
  try {
    const response = await axios.get(`${API_URL}/debtors?limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const debtors = response.data.data.data;
    log(`✓ Total deudores: ${response.data.data.meta.total}`, 'green');
    log('', '');
    
    debtors.forEach((debtor, index) => {
      log(`${index + 1}. ${debtor.fullName}`, 'yellow');
      log(`   ${debtor.documentType} ${debtor.documentNumber}`, 'reset');
      log(`   Teléfono: ${debtor.phone || 'N/A'}`, 'reset');
      log(`   Deuda: $${Number(debtor.debtAmount).toLocaleString()} (${debtor.daysOverdue} días mora)`, 'reset');
      log(`   Estado: ${debtor.status}`, 'reset');
      log('', '');
    });
    
    return true;
  } catch (error) {
    log(`✗ Error listando deudores: ${error.message}`, 'red');
    return false;
  }
}

async function searchTests() {
  log('\n4. PRUEBAS DE BÚSQUEDA', 'cyan');
  log('='.repeat(50), 'cyan');
  
  // Buscar por documento
  try {
    const response = await axios.get(
      `${API_URL}/debtors/search/CC/1234567890`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (response.data.data.data) {
      const debtor = response.data.data.data;
      log('✓ Búsqueda por documento (CC 1234567890):', 'green');
      log(`  ${debtor.fullName} - Deuda: $${Number(debtor.debtAmount).toLocaleString()}`, 'yellow');
    }
  } catch (error) {
    log(`✗ Error buscando por documento: ${error.message}`, 'red');
  }
  
  log('', '');
  
  // Buscar por teléfono
  try {
    const response = await axios.get(
      `${API_URL}/debtors/phone/3147512827`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (response.data.data.data) {
      const debtor = response.data.data.data;
      log('✓ Búsqueda por teléfono (3147512827):', 'green');
      log(`  ${debtor.fullName} - Deuda: $${Number(debtor.debtAmount).toLocaleString()}`, 'yellow');
    }
  } catch (error) {
    log(`✗ Error buscando por teléfono: ${error.message}`, 'red');
  }
}

async function showInstructions() {
  log('\n5. PRUEBA EL BOT', 'cyan');
  log('='.repeat(50), 'cyan');
  log('', '');
  log('📱 INSTRUCCIONES:', 'yellow');
  log('1. Envía un WhatsApp al 3334309474', 'yellow');
  log('2. Desde el 3147512827 (Maria Fernanda Lopez)', 'yellow');
  log('3. El bot debería:', 'yellow');
  log('   ✓ Activarse automáticamente', 'green');
  log('   ✓ Encontrar a Maria en la BD por teléfono', 'green');
  log('   ✓ Saludar: "Hola Maria, deuda: $2,500,000"', 'green');
  log('', '');
}

(async () => {
  log('\n╔════════════════════════════════════════════════════╗', 'cyan');
  log('║  CREAR DEUDORES DE PRUEBA                         ║', 'cyan');
  log('╚════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    if (!await login()) {
      log('\n✗ Test abortado', 'red');
      return;
    }
    
    await createDebtors();
    await listDebtors();
    await searchTests();
    await showInstructions();
    
    log('\n' + '='.repeat(50), 'cyan');
    log('✓ Deudores listos para pruebas', 'green');
    log('='.repeat(50), 'cyan');
    
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    console.error(error);
  }
})();
