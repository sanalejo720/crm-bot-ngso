const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/v1';

async function test() {
  // 1. Login
  console.log('1. Login...');
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@assoftware.xyz',
    password: 'password123'
  });
  const token = loginRes.data.data.accessToken;
  console.log('   Token obtenido');
  
  // 2. Borrar deudores actuales de Desocupados
  console.log('\n2. Borrando deudores de Desocupados...');
  const { Client } = require('pg');
  const client = new Client({
    host: 'localhost',
    database: 'crm_whatsapp',
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    port: 5432,
  });
  await client.connect();
  await client.query(`DELETE FROM debtors WHERE "campaignId" = '770147b5-b93b-4859-9392-0eedc9ffda0a'`);
  console.log('   Borrados');
  
  // 3. Cargar archivo
  console.log('\n3. Cargando archivo Desocupados...');
  const form = new FormData();
  form.append('file', fs.createReadStream('/tmp/desocupados 2023-2025.xlsx'));
  form.append('campaignId', '770147b5-b93b-4859-9392-0eedc9ffda0a');
  
  try {
    const uploadRes = await axios.post(`${API_URL}/debtors/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 600000 // 10 minutos
    });
    
    console.log('   Resultado:', JSON.stringify(uploadRes.data, null, 2));
  } catch (err) {
    console.log('   Error en upload:', err.response?.data || err.message);
  }
  
  // 4. Verificar resultado
  console.log('\n4. Verificando resultados...');
  const count = await client.query(`SELECT COUNT(*) FROM debtors WHERE "campaignId" = '770147b5-b93b-4859-9392-0eedc9ffda0a'`);
  console.log('   Total cargados:', count.rows[0].count);
  
  const search = await client.query(`SELECT "documentNumber", "fullName" FROM debtors WHERE "documentNumber" = '71707874'`);
  console.log('   71707874 encontrado:', search.rows.length > 0 ? 'SÍ' : 'NO');
  
  await client.end();
}

test().catch(console.error);
