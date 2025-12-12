const axios = require('axios');

async function syncChatWithDebtor() {
    try {
        // Login
        const loginResponse = await axios.post('https://ngso-chat.assoftware.xyz/api/v1/auth/login', {
            email: 'admin@assoftware.xyz',
            password: 'password123'
        });
        
        const token = loginResponse.data.data.accessToken;
        console.log('✅ Login exitoso\n');
        
        // Obtener el chat existente
        console.log('📋 Obteniendo chat 573334309474...\n');
        const chatsResponse = await axios.get('https://ngso-chat.assoftware.xyz/api/v1/chats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const chats = chatsResponse.data.data;
        const targetChat = chats.find(c => c.contactPhone && c.contactPhone.includes('3334309474'));
        
        if (!targetChat) {
            console.log('❌ Chat no encontrado');
            return;
        }
        
        console.log('✅ Chat encontrado:', targetChat.id);
        console.log('   Teléfono:', targetChat.contactPhone);
        console.log('   Estado:', targetChat.status);
        console.log('   Campaña:', targetChat.campaignId || 'Sin campaña');
        
        // Buscar deudor con teléfono similar
        console.log('\n📋 Buscando deudor...\n');
        const debtorsResponse = await axios.get('https://ngso-chat.assoftware.xyz/api/v1/debtors', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const debtors = debtorsResponse.data.data.data;
        const matchingDebtor = debtors.find(d => 
            d.phone && (
                d.phone.includes('3334309474') || 
                d.phone.includes('573334309474')
            )
        );
        
        if (matchingDebtor) {
            console.log('✅ Deudor encontrado:', matchingDebtor.fullName);
            console.log('   Teléfono en BD:', matchingDebtor.phone);
            console.log('   Documento:', matchingDebtor.documentType, matchingDebtor.documentNumber);
            console.log('   Deuda:', matchingDebtor.debtAmount);
            
            // Si el teléfono no coincide exactamente, actualizar
            if (matchingDebtor.phone !== targetChat.contactPhone) {
                console.log(`\n⚠️  Los teléfonos no coinciden exactamente:`);
                console.log(`   Chat: ${targetChat.contactPhone}`);
                console.log(`   Deudor: ${matchingDebtor.phone}`);
                console.log(`\n¿Actualizar teléfono del deudor? Ejecuta:`);
                console.log(`   curl -X PATCH https://ngso-chat.assoftware.xyz/api/v1/debtors/${matchingDebtor.id} \\`);
                console.log(`     -H "Authorization: Bearer ${token}" \\`);
                console.log(`     -H "Content-Type: application/json" \\`);
                console.log(`     -d '{"phone":"${targetChat.contactPhone}"}'`);
            }
        } else {
            console.log('❌ No se encontró deudor con ese teléfono');
            console.log('\nDeudores en BD:');
            debtors.forEach(d => {
                console.log(`  - ${d.fullName}: ${d.phone}`);
            });
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

syncChatWithDebtor();
