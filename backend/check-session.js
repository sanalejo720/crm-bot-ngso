/**
 * Verificar sessionName del número WhatsApp
 */

const axios = require('axios');

async function main() {
  // Autenticar
  const authResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
    email: 'admin@crm.com',
    password: 'password123',
  });

  const token = authResponse.data.data.accessToken;
  const headers = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // Obtener número
  const response = await axios.get(
    'http://localhost:3000/api/v1/whatsapp-numbers',
    headers
  );

  const numbers = response.data?.data || response.data || [];
  
  console.log('\n=== NÚMEROS WHATSAPP ===\n');
  numbers.forEach(num => {
    console.log(`Nombre: ${num.displayName}`);
    console.log(`Teléfono: ${num.phoneNumber}`);
    console.log(`ID: ${num.id}`);
    console.log(`SessionName: ${num.sessionName || 'NO DEFINIDO'}`);
    console.log(`Estado: ${num.status}`);
    console.log(`Proveedor: ${num.provider}`);
    console.log('---');
  });
}

main();
