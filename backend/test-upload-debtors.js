/**
 * Script para probar la carga de deudores desde CSV
 * Uso: node test-upload-debtors.js
 */

const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const API_URL = 'http://localhost:3000/api/v1';

async function login() {
  console.log('🔐 Iniciando sesión...');
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@crm.com',
    password: 'password123',
  });
  
  const token = response.data.data?.accessToken || response.data.data?.access_token || response.data.data?.token || response.data.access_token;
  
  if (!token) {
    console.error('❌ No se pudo obtener el token de acceso');
    console.log('Respuesta completa:', JSON.stringify(response.data, null, 2));
    throw new Error('No se pudo obtener el token');
  }
  
  return token;
}

async function uploadCSV(token) {
  const csvPath = path.join(__dirname, 'deudores-plantilla.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Archivo CSV no encontrado:', csvPath);
    return;
  }

  console.log('📁 Cargando archivo:', csvPath);
  console.log('🔑 Token (primeros 20 chars):', token.substring(0, 20) + '...');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(csvPath));

  const headers = {
    ...form.getHeaders(),
    'Authorization': `Bearer ${token}`,
  };

  console.log('📋 Headers:', Object.keys(headers));

  const response = await axios.post(`${API_URL}/debtors/upload`, form, {
    headers,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return response.data;
}

async function main() {
  try {
    // Login
    const token = await login();
    console.log('✅ Sesión iniciada correctamente\n');

    // Upload CSV
    console.log('📤 Subiendo archivo CSV...\n');
    const result = await uploadCSV(token);

    console.log('\n📋 Respuesta completa del servidor:');
    console.log(JSON.stringify(result, null, 2));

    const data = result.data?.data || result.data;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESULTADO DE LA CARGA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Success:', data.success);
    console.log('📝 Total Filas:', data.totalRows);
    console.log('➕ Creados:', data.created);
    console.log('🔄 Actualizados:', data.updated);
    console.log('❌ Fallidos:', data.failed);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (data.summary) {
      console.log('📈 RESUMEN FINANCIERO');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💰 Deuda Total:', new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(data.summary.totalDebt));
      console.log('📅 Mora Promedio:', data.summary.averageDaysOverdue, 'días');
      console.log('\n📋 Por Tipo de Documento:');
      Object.entries(data.summary.byDocumentType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    if (data.errors && data.errors.length > 0) {
      console.log('⚠️  ERRORES ENCONTRADOS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      data.errors.slice(0, 10).forEach(error => {
        console.log(`Fila ${error.row}: ${error.error}`);
        if (error.documentNumber) console.log(`   Documento: ${error.documentNumber}`);
        if (error.fullName) console.log(`   Nombre: ${error.fullName}`);
        console.log('');
      });
      if (data.errors.length > 10) {
        console.log(`... y ${data.errors.length - 10} errores más`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    console.log('✅ Prueba completada exitosamente!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.data?.errors) {
      console.error('\nErrores de validación:');
      error.response.data.data.errors.forEach(err => {
        console.error(`  - Fila ${err.row}: ${err.error}`);
      });
    }
    process.exit(1);
  }
}

main();
