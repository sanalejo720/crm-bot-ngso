// Script para probar el flujo completo de deudores
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/v1';
let authToken = '';

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

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

async function uploadCsv() {
  log('\n2. CARGAR CSV DE DEUDORES', 'cyan');
  log('='.repeat(50), 'cyan');
  
  try {
    const csvPath = path.join(__dirname, 'deudores-ejemplo.csv');
    
    if (!fs.existsSync(csvPath)) {
      log(`✗ Archivo CSV no encontrado: ${csvPath}`, 'red');
      return false;
    }
    
    const form = new FormData();
    form.append('file', fs.createReadStream(csvPath));
    
    const response = await axios.post(
      `${API_URL}/debtors/upload-csv`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    log('✓ CSV cargado exitosamente:', 'green');
    log(`  - Creados: ${response.data.data.created}`, 'yellow');
    log(`  - Actualizados: ${response.data.data.updated}`, 'yellow');
    log(`  - Errores: ${response.data.data.errorsCount}`, 'yellow');
    
    if (response.data.data.errors.length > 0) {
      log('  Errores detectados:', 'red');
      response.data.data.errors.forEach((err) => log(`    - ${err}`, 'red'));
    }
    
    return true;
  } catch (error) {
    log(`✗ Error cargando CSV: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`  Detalles: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return false;
  }
}

async function listDebtors() {
  log('\n3. LISTAR DEUDORES', 'cyan');
  log('='.repeat(50), 'cyan');
  
  try {
    const response = await axios.get(`${API_URL}/debtors?limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const debtors = response.data.data;
    log(`✓ Total deudores: ${response.data.meta.total}`, 'green');
    log('', '');
    
    debtors.slice(0, 5).forEach((debtor, index) => {
      log(`${index + 1}. ${debtor.fullName}`, 'yellow');
      log(`   ${debtor.documentType} ${debtor.documentNumber}`, 'reset');
      log(`   Teléfono: ${debtor.phone || 'N/A'}`, 'reset');
      log(`   Deuda: $${debtor.debtAmount.toLocaleString()} (${debtor.daysOverdue} días mora)`, 'reset');
      log(`   Estado: ${debtor.status}`, 'reset');
      log('', '');
    });
    
    return true;
  } catch (error) {
    log(`✗ Error listando deudores: ${error.message}`, 'red');
    return false;
  }
}

async function searchDebtorByDocument() {
  log('\n4. BUSCAR DEUDOR POR DOCUMENTO', 'cyan');
  log('='.repeat(50), 'cyan');
  
  try {
    // Buscar el primer deudor (Carlos Morales)
    const response = await axios.get(
      `${API_URL}/debtors/search/CC/1234567890`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    if (response.data.data) {
      const debtor = response.data.data;
      log('✓ Deudor encontrado:', 'green');
      log(`  Nombre: ${debtor.fullName}`, 'yellow');
      log(`  Documento: ${debtor.documentType} ${debtor.documentNumber}`, 'yellow');
      log(`  Teléfono: ${debtor.phone}`, 'yellow');
      log(`  Deuda: $${debtor.debtAmount.toLocaleString()}`, 'yellow');
      log(`  Mora: ${debtor.daysOverdue} días`, 'yellow');
      log(`  Producto: ${debtor.metadata?.producto || 'N/A'}`, 'yellow');
    } else {
      log('✗ Deudor no encontrado', 'red');
    }
    
    return true;
  } catch (error) {
    log(`✗ Error buscando deudor: ${error.message}`, 'red');
    return false;
  }
}

async function searchDebtorByPhone() {
  log('\n5. BUSCAR DEUDOR POR TELÉFONO', 'cyan');
  log('='.repeat(50), 'cyan');
  
  try {
    // Buscar por teléfono de Maria (3147512827)
    const response = await axios.get(
      `${API_URL}/debtors/phone/3147512827`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    if (response.data.data) {
      const debtor = response.data.data;
      log('✓ Deudor encontrado:', 'green');
      log(`  Nombre: ${debtor.fullName}`, 'yellow');
      log(`  Documento: ${debtor.documentType} ${debtor.documentNumber}`, 'yellow');
      log(`  Deuda: $${debtor.debtAmount.toLocaleString()}`, 'yellow');
      log(`  Mora: ${debtor.daysOverdue} días`, 'yellow');
    } else {
      log('✗ Deudor no encontrado', 'red');
    }
    
    return true;
  } catch (error) {
    log(`✗ Error buscando deudor: ${error.message}`, 'red');
    return false;
  }
}

async function testBotActivation() {
  log('\n6. TEST DE ACTIVACIÓN DE BOT', 'cyan');
  log('='.repeat(50), 'cyan');
  log('', '');
  log('📱 INSTRUCCIONES:', 'yellow');
  log('1. Envía un mensaje de WhatsApp al 3334309474', 'yellow');
  log('2. Desde el número 3147512827 (o cualquier otro)', 'yellow');
  log('3. El bot debería:', 'yellow');
  log('   - Activarse automáticamente (sin asesor asignado)', 'yellow');
  log('   - Buscar al deudor por teléfono', 'yellow');
  log('   - Si lo encuentra: saludar con datos de deuda', 'yellow');
  log('   - Si NO lo encuentra: pedir tipo y número de documento', 'yellow');
  log('', '');
  log('⚠️  Nota: Asegúrate de que la campaña tenga:', 'cyan');
  log('   - botEnabled: true', 'cyan');
  log('   - botFlowId configurado', 'cyan');
  log('', '');
}

// Ejecutar tests
(async () => {
  log('\n╔════════════════════════════════════════════════════╗', 'cyan');
  log('║  TEST COMPLETO: Módulo de Deudores y Bot          ║', 'cyan');
  log('╚════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    // 1. Login
    if (!await login()) {
      log('\n✗ Test abortado: fallo en autenticación', 'red');
      return;
    }
    
    // 2. Cargar CSV
    if (!await uploadCsv()) {
      log('\n⚠️  Continuando sin CSV (puede estar ya cargado)', 'yellow');
    }
    
    // 3. Listar deudores
    await listDebtors();
    
    // 4. Buscar por documento
    await searchDebtorByDocument();
    
    // 5. Buscar por teléfono
    await searchDebtorByPhone();
    
    // 6. Instrucciones para test de bot
    await testBotActivation();
    
    log('\n' + '='.repeat(50), 'cyan');
    log('✓ Tests completados', 'green');
    log('='.repeat(50), 'cyan');
    
  } catch (error) {
    log(`\n✗ Error inesperado: ${error.message}`, 'red');
    console.error(error);
  }
})();
