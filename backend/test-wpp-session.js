const axios = require('axios');

async function testWhatsAppSession() {
  const baseURL = 'http://localhost:3000/api/v1';
  
  console.log('\n🔍 Verificando sesiones WPPConnect...\n');
  
  try {
    // 1. Verificar estado de las sesiones
    console.log('1️⃣ Consultando números registrados...');
    const numbersResponse = await axios.get(`${baseURL}/whatsapp/numbers`);
    const numbers = numbersResponse.data.data || numbersResponse.data;
    
    console.log(`   ✅ Números encontrados: ${numbers.length}`);
    numbers.forEach(num => {
      console.log(`   📱 ${num.phoneNumber} - ${num.status} - ${num.isActive ? 'Activo' : 'Inactivo'}`);
    });
    
    // 2. Verificar sesión activa
    const activeNumber = numbers.find(n => n.isActive && n.status === 'connected');
    
    if (!activeNumber) {
      console.log('\n⚠️  No hay números activos y conectados');
      
      // Intentar activar el primer número
      const firstNumber = numbers[0];
      if (firstNumber) {
        console.log(`\n2️⃣ Intentando activar ${firstNumber.phoneNumber}...`);
        try {
          await axios.patch(`${baseURL}/whatsapp/numbers/${firstNumber.id}/activate`);
          console.log('   ✅ Número activado');
        } catch (error) {
          console.log(`   ❌ Error al activar: ${error.response?.data?.message || error.message}`);
        }
        
        console.log('\n3️⃣ Iniciando sesión...');
        try {
          const startResponse = await axios.post(`${baseURL}/whatsapp/session/${firstNumber.sessionName || firstNumber.phoneNumber}/start`);
          console.log('   ✅ Sesión iniciada');
          console.log('   📄 Respuesta:', JSON.stringify(startResponse.data, null, 2));
        } catch (error) {
          console.log(`   ❌ Error al iniciar: ${error.response?.data?.message || error.message}`);
        }
      }
    } else {
      console.log(`\n✅ Número activo encontrado: ${activeNumber.phoneNumber}`);
      
      // Verificar estado de la sesión
      console.log('\n2️⃣ Verificando estado de la sesión...');
      try {
        const statusResponse = await axios.get(`${baseURL}/whatsapp/session/${activeNumber.sessionName || activeNumber.phoneNumber}/status`);
        console.log('   ✅ Estado:', JSON.stringify(statusResponse.data, null, 2));
      } catch (error) {
        console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
        
        // Si falla, intentar reconectar
        console.log('\n3️⃣ Intentando reconectar sesión...');
        try {
          await axios.post(`${baseURL}/whatsapp/session/${activeNumber.sessionName || activeNumber.phoneNumber}/start`);
          console.log('   ✅ Sesión reiniciada');
        } catch (error) {
          console.log(`   ❌ Error al reconectar: ${error.response?.data?.message || error.message}`);
        }
      }
    }
    
    // 4. Enviar mensaje de prueba
    console.log('\n4️⃣ Probando envío de mensaje...');
    try {
      const testMessage = await axios.post(`${baseURL}/whatsapp/messages/send`, {
        to: '573180691289', // Cambiar por tu número
        message: '🤖 Test de conexión bot - ' + new Date().toLocaleString()
      });
      console.log('   ✅ Mensaje enviado:', testMessage.data);
    } catch (error) {
      console.log(`   ❌ Error al enviar: ${error.response?.data?.message || error.message}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error general:', error.response?.data || error.message);
  }
  
  console.log('\n✅ Verificación completada\n');
}

testWhatsAppSession();
