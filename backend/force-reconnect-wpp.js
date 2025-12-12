const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!',
});

async function forceReconnect() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a la base de datos\n');

    // 1. Obtener el número activo
    const { rows: numbers } = await client.query(`
      SELECT id, "phoneNumber", "sessionName", status, "isActive"
      FROM whatsapp_numbers
      WHERE "isActive" = true
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (numbers.length === 0) {
      console.log('⚠️  No hay números activos. Activando el primero disponible...');
      
      const { rows: allNumbers } = await client.query(`
        SELECT id, "phoneNumber", "sessionName"
        FROM whatsapp_numbers
        ORDER BY "createdAt" DESC
        LIMIT 1
      `);
      
      if (allNumbers.length === 0) {
        console.log('❌ No hay números registrados en el sistema');
        return;
      }
      
      const firstNumber = allNumbers[0];
      await client.query(`
        UPDATE whatsapp_numbers
        SET "isActive" = true, "updatedAt" = NOW()
        WHERE id = $1
      `, [firstNumber.id]);
      
      console.log(`✅ Número ${firstNumber.phoneNumber} activado\n`);
      numbers.push(firstNumber);
    }

    const activeNumber = numbers[0];
    const sessionName = activeNumber.sessionName || activeNumber.phoneNumber;
    
    console.log(`📱 Número activo: ${activeNumber.phoneNumber}`);
    console.log(`🔑 Sesión: ${sessionName}`);
    console.log(`📊 Estado actual: ${activeNumber.status}\n`);

    // 2. Verificar si existe el directorio de sesión
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    console.log('🔍 Verificando archivos de sesión...');
    try {
      const { stdout } = await execPromise(`ls -la /home/azureuser/crm-ngso-whatsapp/backend/wpp-sessions/`);
      console.log(stdout);
      
      const hasSession = stdout.includes(sessionName);
      console.log(hasSession ? '✅ Archivos de sesión encontrados' : '⚠️  No hay archivos de sesión guardados');
    } catch (error) {
      console.log('⚠️  Directorio wpp-sessions no existe o está vacío');
    }
    
    console.log('\n3️⃣ Enviando comando de inicio de sesión...\n');
    
    // 3. Hacer llamada HTTP interna para iniciar sesión
    try {
      const response = await axios.post(`http://localhost:3000/api/v1/whatsapp-numbers/${activeNumber.id}/wppconnect/start`, {}, {
        timeout: 30000,
        validateStatus: () => true // Aceptar cualquier status
      });
      
      console.log(`📡 Status HTTP: ${response.status}`);
      console.log(`📄 Respuesta:`, JSON.stringify(response.data, null, 2));
      
      if (response.status === 200 || response.status === 201) {
        console.log('\n✅ Sesión iniciada correctamente');
        
        // Actualizar estado en BD
        await client.query(`
          UPDATE whatsapp_numbers
          SET status = 'connected', "lastConnectedAt" = NOW(), "updatedAt" = NOW()
          WHERE id = $1
        `, [activeNumber.id]);
        
        console.log('✅ Estado actualizado en base de datos');
      } else if (response.data?.qrCode) {
        console.log('\n📱 Se requiere escanear código QR');
        console.log('🔗 Accede a: http://localhost:3000/api/v1/whatsapp/session/' + sessionName + '/qr');
      } else {
        console.log('\n⚠️  Respuesta inesperada del servidor');
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ No se pudo conectar al servidor backend');
        console.log('   Verifica que el servidor esté corriendo en puerto 3000');
      } else {
        console.log('❌ Error:', error.message);
        if (error.response) {
          console.log('📄 Respuesta:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }
    
    // 4. Verificar estado después de 5 segundos
    console.log('\n⏳ Esperando 5 segundos para verificar conexión...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      const statusResponse = await axios.get(`http://localhost:3000/api/v1/whatsapp-numbers/${activeNumber.id}/wppconnect/status`, {
        validateStatus: () => true
      });
      
      console.log('\n📊 Estado final:');
      console.log(JSON.stringify(statusResponse.data, null, 2));
      
    } catch (error) {
      console.log('\n⚠️  No se pudo verificar el estado final');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

forceReconnect();
