/**
 * Script Debug - Ver Sesiones Activas
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

async function authenticate() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: 'admin@crm.com',
    password: 'password123',
  });
  authToken = response.data.data.accessToken;
  console.log('✓ Autenticado\n');
}

async function getDebugInfo() {
  const response = await axios.get(`${API_BASE_URL}/whatsapp/debug/sessions`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const data = response.data?.data || response.data;
  
  console.log('═════════════════════════════════════════════════════════');
  console.log('           SESIONES ACTIVAS EN WPPCONNECT');
  console.log('═════════════════════════════════════════════════════════\n');
  
  console.log('Sesiones en WPPConnect (en memoria):');
  if (data.wppConnectSessions && data.wppConnectSessions.length > 0) {
    data.wppConnectSessions.forEach((session, idx) => {
      console.log(`  ${idx + 1}. "${session}"`);
    });
  } else {
    console.log('  (ninguna)');
  }
  
  console.log('\n─────────────────────────────────────────────────────────\n');
  
  console.log('Números en Base de Datos:');
  if (data.databaseNumbers && data.databaseNumbers.length > 0) {
    data.databaseNumbers.forEach((num, idx) => {
      console.log(`  ${idx + 1}. ${num.phone}`);
      console.log(`     ID: ${num.id}`);
      console.log(`     SessionName: ${num.sessionName || 'NO DEFINIDO'}`);
      console.log(`     Estado: ${num.status}\n`);
    });
  } else {
    console.log('  (ninguno)');
  }
  
  console.log('═════════════════════════════════════════════════════════\n');
  
  // Análisis
  if (data.wppConnectSessions.length === 0) {
    console.log('⚠️  PROBLEMA: No hay sesiones activas en WPPConnect');
    console.log('   Solución: Reconecta el WhatsApp escaneando el QR\n');
  } else if (data.databaseNumbers.some(n => !n.sessionName)) {
    console.log('⚠️  PROBLEMA: Algunos números no tienen sessionName');
    console.log('   Solución: Se debe guardar cuando se conecta\n');
  } else {
    const match = data.databaseNumbers.find(n => 
      data.wppConnectSessions.includes(n.sessionName)
    );
    
    if (match) {
      console.log(`✓ CORRECTO: SessionName "${match.sessionName}" coincide`);
      console.log(`  Se puede enviar mensajes desde: ${match.phone}\n`);
    } else {
      console.log('⚠️  PROBLEMA: Los sessionNames no coinciden');
      console.log('   WPPConnect tiene:', data.wppConnectSessions.join(', '));
      console.log('   BD tiene:', data.databaseNumbers.map(n => n.sessionName).join(', '));
      console.log('\n   Solución: Reconectar WhatsApp para sincronizar\n');
    }
  }
}

async function main() {
  try {
    await authenticate();
    await getDebugInfo();
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
