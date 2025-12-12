// Test de login y estado WhatsApp
const http = require('http');

const users = [
  { email: 'admin@assoftware.xyz', password: 'password123', role: 'Super Admin' },
  { email: 'a.prueba1@prueba.com', password: 'password123', role: 'Agente 1' },
  { email: 'a.prueba2@prueba.com', password: 'password123', role: 'Agente 2' },
];

function httpRequest(options, data = null) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } 
        catch (e) { resolve({ error: body }); }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function testLogin(user) {
  const data = JSON.stringify({ email: user.email, password: user.password });
  const result = await httpRequest({
    hostname: 'localhost', port: 3000, path: '/api/v1/auth/login',
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
  }, data);
  
  // La respuesta viene en result.data.accessToken (camelCase)
  const token = result.data?.accessToken || result.access_token;
  if (token) {
    console.log(`✅ ${user.role} (${user.email}): LOGIN OK - ${result.data?.user?.fullName}`);
    return { ...user, token, success: true, userData: result.data?.user };
  } else {
    console.log(`❌ ${user.role} (${user.email}): ${result.message || JSON.stringify(result)}`);
    return { ...user, success: false };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔐 TEST DE LOGIN DE USUARIOS');
  console.log('='.repeat(60));
  
  const results = [];
  for (const user of users) results.push(await testLogin(user));
  
  const admin = results.find(r => r.role === 'Super Admin' && r.success);
  if (!admin) { console.log('❌ No se pudo autenticar admin'); return; }
  
  const headers = { 'Authorization': `Bearer ${admin.token}`, 'Content-Type': 'application/json' };
  
  console.log('\n' + '='.repeat(60));
  console.log('📱 ESTADO WHATSAPP');
  console.log('='.repeat(60));
  
  const numbers = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/v1/whatsapp-numbers', method: 'GET', headers });
  
  if (Array.isArray(numbers)) {
    for (const num of numbers) {
      console.log(`\n📞 ${num.displayName || num.phoneNumber}`);
      console.log(`   ID: ${num.id} | Provider: ${num.provider} | Status: ${num.status} | Active: ${num.isActive}`);
      console.log(`   Session: ${num.sessionName || 'N/A'}`);
      
      const session = await httpRequest({ hostname: 'localhost', port: 3000, path: `/api/v1/whatsapp-numbers/${num.id}/session-status`, method: 'GET', headers });
      console.log(`   Sesión Real: ${JSON.stringify(session)}`);
    }
  } else {
    console.log('⚠️ WhatsApp Numbers:', JSON.stringify(numbers));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💬 ÚLTIMOS CHATS');
  console.log('='.repeat(60));
  
  const chats = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/v1/chats?limit=5', method: 'GET', headers });
  if (chats.data) {
    for (const c of chats.data) {
      console.log(`  ${c.contactName || c.contactPhone}: ${c.status} | Bot: ${c.is_bot_active ? 'Sí' : 'No'} | Último: ${c.lastMessageAt || 'N/A'}`);
    }
  } else {
    console.log('⚠️', JSON.stringify(chats));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESUMEN: ${results.filter(r=>r.success).length}/${results.length} logins exitosos`);
  console.log('='.repeat(60));
}

main().catch(console.error);
