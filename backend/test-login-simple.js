const axios = require('axios');

async function testLogin() {
    try {
        console.log('🔍 Probando login...');
        const response = await axios.post('https://ngso-chat.assoftware.xyz/api/v1/auth/login', {
            email: 'admin@assoftware.xyz',
            password: 'password123'
        });
        
        console.log('✅ Status:', response.status);
        console.log('📦 Data:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error:', error.response?.status || error.message);
        console.log('📦 Response:', JSON.stringify(error.response?.data, null, 2));
    }
}

testLogin();
