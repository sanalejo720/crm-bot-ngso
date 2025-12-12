const axios = require('axios');

async function testRoles() {
    try {
        // Login
        const loginResponse = await axios.post('https://ngso-chat.assoftware.xyz/api/v1/auth/login', {
            email: 'admin@assoftware.xyz',
            password: 'password123'
        });
        
        const token = loginResponse.data.data.accessToken;
        
        // Test roles
        console.log('📋 Testing /roles...');
        const rolesResponse = await axios.get('https://ngso-chat.assoftware.xyz/api/v1/roles', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Estructura completa:');
        console.log(JSON.stringify(rolesResponse.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Response:', JSON.stringify(error.response?.data, null, 2));
    }
}

testRoles();
