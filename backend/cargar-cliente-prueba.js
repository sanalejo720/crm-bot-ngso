/**
 * Script para cargar el cliente de prueba real
 * Uso: node cargar-cliente-prueba.js
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
  
  const token = response.data.data?.accessToken;
  
  if (!token) {
    throw new Error('No se pudo obtener el token');
  }
  
  return token;
}

async function uploadCSV(token) {
  const csvPath = path.join(__dirname, 'deudores-prueba-real.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Archivo CSV no encontrado:', csvPath);
    return;
  }

  console.log('📁 Cargando archivo:', csvPath);
  
  const form = new FormData();
  form.append('file', fs.createReadStream(csvPath));

  const headers = {
    ...form.getHeaders(),
    'Authorization': `Bearer ${token}`,
  };

  const response = await axios.post(`${API_URL}/debtors/upload`, form, {
    headers,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return response.data;
}

async function verifyDebtor(token) {
  console.log('\n🔍 Verificando registro del cliente...');
  
  const response = await axios.get(
    `${API_URL}/debtors/search/CC/1061749683`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

async function main() {
  try {
    // Login
    const token = await login();
    console.log('✅ Sesión iniciada correctamente\n');

    // Upload CSV
    console.log('📤 Subiendo cliente de prueba...\n');
    const uploadResult = await uploadCSV(token);

    const data = uploadResult.data?.data || uploadResult.data;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESULTADO DE LA CARGA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Success:', data.success);
    console.log('📝 Total Filas:', data.totalRows);
    console.log('➕ Creados:', data.created);
    console.log('🔄 Actualizados:', data.updated);
    console.log('❌ Fallidos:', data.failed);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar que se creó correctamente
    const verification = await verifyDebtor(token);
    
    if (verification.data) {
      console.log('✅ CLIENTE REGISTRADO EXITOSAMENTE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 Nombre:', verification.data.fullName);
      console.log('📄 Documento:', verification.data.documentType, verification.data.documentNumber);
      console.log('📱 Teléfono:', verification.data.phone);
      console.log('💰 Deuda:', new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(verification.data.debtAmount));
      console.log('🏢 Compañía:', verification.data.metadata?.compania || 'N/A');
      console.log('📊 Estado:', verification.data.status);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('🎉 El cliente está listo para ser contactado por WhatsApp!');
      console.log('📞 Número de WhatsApp: 573334309474');
      console.log('\n💡 Ahora cuando este cliente escriba por WhatsApp, el sistema lo reconocerá automáticamente.');
    } else {
      console.log('⚠️  Cliente no encontrado en la base de datos');
    }

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
