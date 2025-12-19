const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

// Configuración
const API_HOST = 'localhost';
const API_PORT = 3000;

// Mapeo de archivos a campañas
const fileConfig = [
  { 
    file: '/tmp/castigo.xlsx', 
    campaignId: 'f1bdb1f5-619b-4716-9cda-daa5f388aea1',  // Castigo
    name: 'Castigo'
  },
  { 
    file: '/tmp/desistidos.xlsx', 
    campaignId: '31238141-7ac1-4f0c-864f-933f3a6032b8',  // Desistidos
    name: 'Desistidos'
  },
  { 
    file: '/tmp/desocupados 2023-2025.xlsx', 
    campaignId: '770147b5-b93b-4859-9392-0eedc9ffda0a',  // Desocupados
    name: 'Desocupados 2023-2025'
  },
];

// Primero obtener token de autenticación
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'admin@assoftware.xyz',
      password: 'password123'
    });

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.data && result.data.accessToken) {
            resolve(result.data.accessToken);
          } else {
            reject(new Error('No token in response: ' + data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Subir archivo
async function uploadFile(filePath, campaignId, token) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('campaignId', campaignId);

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/v1/debtors/upload',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

async function main() {
  console.log('=== Cargando Bases de Deudores ===\n');
  
  // 1. Autenticación
  console.log('1. Obteniendo token de autenticación...');
  const token = await getAuthToken();
  console.log('   ✅ Token obtenido\n');
  
  // 2. Cargar cada archivo
  for (const config of fileConfig) {
    console.log(`2. Cargando ${config.name}...`);
    console.log(`   Archivo: ${config.file}`);
    console.log(`   Campaña: ${config.campaignId}`);
    
    try {
      const result = await uploadFile(config.file, config.campaignId, token);
      
      if (result.success || result.data) {
        const data = result.data || result;
        console.log(`   ✅ ${config.name} cargado exitosamente!`);
        console.log(`      - Total filas: ${data.totalRows || 'N/A'}`);
        console.log(`      - Creados: ${data.created || 'N/A'}`);
        console.log(`      - Actualizados: ${data.updated || 'N/A'}`);
        console.log(`      - Duplicados: ${data.duplicated || 'N/A'}`);
        console.log(`      - Errores: ${data.failed || 'N/A'}`);
      } else {
        console.log(`   ❌ Error: ${JSON.stringify(result)}`);
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
    console.log('');
  }
  
  console.log('=== Carga completada ===');
}

main().catch(console.error);
