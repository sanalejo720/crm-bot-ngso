const axios = require('axios');

async function checkClients() {
  try {
    console.log('🔍 Verificando clientes WPPConnect activos...\n');
    
    // Hacer request al endpoint de debug
    const response = await axios.get('http://localhost:3000/api/v1/whatsapp/debug/sessions');
    
    console.log('📊 Respuesta del servidor:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Error HTTP:', error.response.status);
      console.log('📄 Respuesta:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

checkClients();
