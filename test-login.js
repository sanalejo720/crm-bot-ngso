const axios = require('axios');

async function testLogin() {
  try {
    console.log('Probando login con admin...');
    const r1 = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'admin@assoftware.xyz',
      password: 'password123'
    });
    console.log('✓ Admin login OK');
    console.log(JSON.stringify(r1.data, null, 2));
  } catch (e) {
    console.log('✗ Admin login FAIL:', e.response?.data?.message || e.message);
  }

  try {
    console.log('\nProbando login con agente...');
    const r2 = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'a.prueba1@prueba.com',
      password: 'password123'
    });
    console.log('✓ Agente login OK');
    console.log(JSON.stringify(r2.data, null, 2));
  } catch (e) {
    console.log('✗ Agente login FAIL:', e.response?.data?.message || e.message);
  }
}

testLogin();
