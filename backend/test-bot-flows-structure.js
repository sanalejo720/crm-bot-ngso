const axios = require('axios');

async function testBotFlows() {
    try {
        // Login
        const loginResponse = await axios.post('https://ngso-chat.assoftware.xyz/api/v1/auth/login', {
            email: 'admin@assoftware.xyz',
            password: 'password123'
        });
        
        const token = loginResponse.data.data.accessToken;
        
        // Test bot-flows list
        console.log('📋 Testing /bot-flows...');
        const flowsResponse = await axios.get('https://ngso-chat.assoftware.xyz/api/v1/bot-flows', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Estructura:');
        console.log(JSON.stringify(flowsResponse.data, null, 2).substring(0, 500));
        
        // Test crear flujo
        console.log('\n📋 Testing POST /bot-flows...');
        const createResponse = await axios.post('https://ngso-chat.assoftware.xyz/api/v1/bot-flows', {
            name: 'Test Flow API',
            description: 'Test description',
            status: 'draft',
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Respuesta crear:');
        console.log(JSON.stringify(createResponse.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Response:', JSON.stringify(error.response?.data, null, 2));
    }
}

testBotFlows();
