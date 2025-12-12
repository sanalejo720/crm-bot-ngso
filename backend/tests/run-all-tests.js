/**
 * EJECUTOR PRINCIPAL DE TESTS
 * Ejecuta todos los tests en secuencia
 */

const { testAuth } = require('./01-auth-test');
const { testUsers } = require('./02-users-test');
const { testCampaigns } = require('./03-campaigns-test');
const { testChatsAndMessages } = require('./04-chats-messages-test');
const { testBotFlows } = require('./05-bot-flows-test');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

async function runAllTests() {
  console.log('\n' + '═'.repeat(70));
  console.log(colors.cyan + '🚀 INICIANDO SUITE COMPLETA DE TESTS - CRM WhatsApp NGSO' + colors.reset);
  console.log('═'.repeat(70) + '\n');

  const startTime = Date.now();
  const allResults = {
    auth: null,
    users: null,
    campaigns: null,
    chatsMessages: null,
    botFlows: null,
  };

  try {
    // 1. Tests de Autenticación
    console.log(colors.magenta + '\n┌─────────────────────────────────────────┐' + colors.reset);
    console.log(colors.magenta + '│  MÓDULO 1: AUTENTICACIÓN               │' + colors.reset);
    console.log(colors.magenta + '└─────────────────────────────────────────┘' + colors.reset);
    allResults.auth = await testAuth();
    
    if (allResults.auth.failed > 0) {
      console.log(colors.yellow + '\n⚠️  Advertencia: Fallos en autenticación. Continuando...' + colors.reset);
    }

    // 2. Tests de Usuarios
    console.log(colors.magenta + '\n┌─────────────────────────────────────────┐' + colors.reset);
    console.log(colors.magenta + '│  MÓDULO 2: USUARIOS Y AGENTES          │' + colors.reset);
    console.log(colors.magenta + '└─────────────────────────────────────────┘' + colors.reset);
    allResults.users = await testUsers(global.superAdminToken);

    // 3. Tests de Campañas
    console.log(colors.magenta + '\n┌─────────────────────────────────────────┐' + colors.reset);
    console.log(colors.magenta + '│  MÓDULO 3: CAMPAÑAS                    │' + colors.reset);
    console.log(colors.magenta + '└─────────────────────────────────────────┘' + colors.reset);
    allResults.campaigns = await testCampaigns(global.superAdminToken);

    // 4. Tests de Chats y Mensajes
    console.log(colors.magenta + '\n┌─────────────────────────────────────────┐' + colors.reset);
    console.log(colors.magenta + '│  MÓDULO 4: CHATS Y MENSAJES            │' + colors.reset);
    console.log(colors.magenta + '└─────────────────────────────────────────┘' + colors.reset);
    allResults.chatsMessages = await testChatsAndMessages(global.superAdminToken);

    // 5. Tests de Bot y Flujos
    console.log(colors.magenta + '\n┌─────────────────────────────────────────┐' + colors.reset);
    console.log(colors.magenta + '│  MÓDULO 5: BOT Y FLUJOS                │' + colors.reset);
    console.log(colors.magenta + '└─────────────────────────────────────────┘' + colors.reset);
    allResults.botFlows = await testBotFlows(global.superAdminToken);

  } catch (error) {
    console.error(colors.red + '\n❌ Error fatal durante la ejecución:' + colors.reset, error.message);
    process.exit(1);
  }

  // Calcular totales
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  const totals = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  Object.values(allResults).forEach(result => {
    if (result) {
      totals.total += result.total;
      totals.passed += result.passed;
      totals.failed += result.failed;
    }
  });

  // Resumen final
  console.log('\n' + '═'.repeat(70));
  console.log(colors.cyan + '📊 RESUMEN GENERAL DE TESTS' + colors.reset);
  console.log('═'.repeat(70));
  
  console.log('\n📋 Por Módulo:');
  console.log(`   🔐 Autenticación:      ${allResults.auth?.passed || 0}/${allResults.auth?.total || 0} exitosos`);
  console.log(`   👥 Usuarios:           ${allResults.users?.passed || 0}/${allResults.users?.total || 0} exitosos`);
  console.log(`   📢 Campañas:           ${allResults.campaigns?.passed || 0}/${allResults.campaigns?.total || 0} exitosos`);
  console.log(`   💬 Chats/Mensajes:     ${allResults.chatsMessages?.passed || 0}/${allResults.chatsMessages?.total || 0} exitosos`);
  console.log(`   🤖 Bot/Flujos:         ${allResults.botFlows?.passed || 0}/${allResults.botFlows?.total || 0} exitosos`);

  console.log('\n' + '─'.repeat(70));
  console.log(`   TOTAL TESTS:           ${totals.total}`);
  console.log(`   ${colors.green}✅ EXITOSOS:           ${totals.passed}${colors.reset}`);
  console.log(`   ${colors.red}❌ FALLIDOS:           ${totals.failed}${colors.reset}`);
  console.log(`   ${colors.blue}📈 PORCENTAJE:         ${((totals.passed / totals.total) * 100).toFixed(1)}%${colors.reset}`);
  console.log(`   ⏱️  DURACIÓN:           ${duration}s`);
  console.log('─'.repeat(70));

  // Resultado final
  if (totals.failed === 0) {
    console.log(colors.green + '\n✅ ¡TODOS LOS TESTS PASARON EXITOSAMENTE!' + colors.reset);
    console.log('═'.repeat(70) + '\n');
    process.exit(0);
  } else {
    console.log(colors.yellow + `\n⚠️  ${totals.failed} TEST(S) FALLARON` + colors.reset);
    console.log(colors.yellow + '   Revisa los logs arriba para más detalles.' + colors.reset);
    console.log('═'.repeat(70) + '\n');
    process.exit(1);
  }
}

// Ejecutar
runAllTests();
