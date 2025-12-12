const fs = require('fs');
const path = require('path');

const testFiles = [
    'tests/01-auth-test.js',
    'tests/02-users-test.js',
    'tests/03-campaigns-test.js',
    'tests/04-chats-messages-test.js',
    'tests/05-bot-flows-test.js'
];

testFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Reemplazar referencias a response.data por response.data.data
    // Excepto las que ya son response.data.data
    
    // Para verificaciones if
    content = content.replace(/if \(response\.data\.length/g, 'if (response.data.data.length');
    content = content.replace(/if \(response\.data\.id/g, 'if (response.data.data.id');
    content = content.replace(/if \(Array\.isArray\(response\.data\)/g, 'if (Array.isArray(response.data.data)');
    
    // Para asignaciones de variables
    content = content.replace(/= response\.data\.length/g, '= response.data.data.length');
    content = content.replace(/= response\.data\.id/g, '= response.data.data.id');
    content = content.replace(/= response\.data\.name/g, '= response.data.data.name');
    content = content.replace(/= response\.data\.email/g, '= response.data.data.email');
    
    // Para accesos en logs y mensajes
    content = content.replace(/\${response\.data\.length}/g, '${response.data.data.length}');
    content = content.replace(/\${response\.data\.id}/g, '${response.data.data.id}');
    content = content.replace(/\${response\.data\.name}/g, '${response.data.data.name}');
    content = content.replace(/\${response\.data\.email}/g, '${response.data.data.email}');
    
    // Para objetos complejos
    content = content.replace(/response\.data\.whatsappNumberId/g, 'response.data.data.whatsappNumberId');
    content = content.replace(/response\.data\.campaign/g, 'response.data.data.campaign');
    content = content.replace(/response\.data\.campaignId/g, 'response.data.data.campaignId');
    content = content.replace(/response\.data\.startNodeId/g, 'response.data.data.startNodeId');
    content = content.replace(/response\.data\.status/g, 'response.data.data.status');
    content = content.replace(/response\.data\.botEnabled/g, 'response.data.data.botEnabled');
    content = content.replace(/response\.data\.isActive/g, 'response.data.data.isActive');
    
    // Para arrays que se guardan
    content = content.replace(/global\.whatsappNumber = response\.data\[0\]/g, 'global.whatsappNumber = response.data.data[0]');
    content = content.replace(/global\.existingCampaignId = response\.data\[0\]\.id/g, 'global.existingCampaignId = response.data.data[0].id');
    content = content.replace(/global\.existingChatId = response\.data\[0\]\.id/g, 'global.existingChatId = response.data.data[0].id');
    content = content.replace(/global\.existingFlowId = response\.data\[0\]\.id/g, 'global.existingFlowId = response.data.data[0].id');
    
    // Para el test de buscar agente
    content = content.replace(/response\.data\[0\]\.id === createdUserId/g, 'response.data.data[0].id === createdUserId');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Actualizado: ${file}`);
});

console.log('\n✨ Todos los archivos de test actualizados');
