const axios = require('axios');

async function checkDebtors() {
    try {
        // Login
        const loginResponse = await axios.post('https://ngso-chat.assoftware.xyz/api/v1/auth/login', {
            email: 'admin@assoftware.xyz',
            password: 'password123'
        });
        
        const token = loginResponse.data.data.accessToken;
        console.log('✅ Login exitoso\n');
        
        // Verificar deudores
        console.log('📋 Consultando deudores...\n');
        const debtorsResponse = await axios.get('https://ngso-chat.assoftware.xyz/api/v1/debtors', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Estructura de respuesta:');
        console.log(JSON.stringify(debtorsResponse.data, null, 2).substring(0, 1000));
        
        const debtors = debtorsResponse.data.data?.data || debtorsResponse.data.data || debtorsResponse.data;
        
        if (Array.isArray(debtors)) {
            console.log(`\n✅ ${debtors.length} deudores encontrados:`);
            debtors.forEach((d, i) => {
                console.log(`\n${i+1}. ${d.fullName || 'Sin nombre'}`);
                console.log(`   Doc: ${d.documentType} ${d.documentNumber}`);
                console.log(`   Tel: ${d.phone}`);
                console.log(`   Deuda: $${d.debtAmount}`);
            });
        } else {
            console.log('\n❌ La respuesta no es un array');
            console.log('Tipo:', typeof debtors);
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Response:', JSON.stringify(error.response?.data, null, 2));
    }
}

checkDebtors();
