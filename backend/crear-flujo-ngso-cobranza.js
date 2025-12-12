/**
 * Script para crear el flujo de bot de cobranza NGSO
 * Con mensajes de autorización de datos, validación de deudor y transferencia a agente
 * Incluye botones interactivos de Twilio/WhatsApp
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';
let authToken = '';

// Helper para obtener datos de respuesta (maneja la estructura anidada)
function getData(response) {
  // La API puede retornar: response.data.data.data (más anidado) o response.data.data o response.data
  const data = response.data;
  if (data?.data?.data) return data.data.data;
  if (data?.data) return data.data;
  return data;
}

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login() {
  log('\n🔐 Autenticando...', 'cyan');
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@assoftware.xyz',
    password: 'password123',
  });
  authToken = getData(response).accessToken;
  log('✅ Autenticado correctamente', 'green');
  return authToken;
}

async function createFlow() {
  log('\n📋 Creando flujo de bot NGSO Cobranza...', 'cyan');
  
  const response = await axios.post(
    `${API_URL}/bot-flows`,
    {
      name: 'Flujo Cobranza NGSO - Autorización y Validación',
      description: 'Flujo de cobranza con autorización de datos personales (Ley 1581), validación de deudor y transferencia a agente. Incluye botones interactivos.',
      status: 'draft',
      variables: {
        clientName: { name: 'Nombre del cliente', type: 'string', defaultValue: 'Cliente' },
        clientPhone: { name: 'Teléfono del cliente', type: 'string', defaultValue: '' },
        documentNumber: { name: 'Número de documento', type: 'string', defaultValue: '' },
        debtorFound: { name: 'Deudor encontrado', type: 'boolean', defaultValue: false },
      },
      settings: {
        maxInactivityTime: 30,
        transferToAgentOnError: true,
        fallbackMessage: 'Lo siento, no entendí tu respuesta. Por favor intenta de nuevo o escribe "agente" para hablar con un asesor.',
      },
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  const flowId = getData(response).id;
  log(`✅ Flujo creado con ID: ${flowId}`, 'green');
  return flowId;
}

async function createNodes(flowId) {
  log('\n🔧 Creando nodos del flujo...', 'cyan');

  const nodes = [];
  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  // Función helper para crear nodo
  async function createNode(name, type, config) {
    const response = await api.post(`/bot-flows/${flowId}/nodes`, { name, type, config });
    const node = getData(response);
    nodes.push(node);
    log(`    ✓ ${name}: ${node.id}`, 'green');
    return node;
  }

  // NODO 1: Saludo + Autorización
  log('  📝 Creando nodos...', 'yellow');
  const msgSaludo = '👋 Hola {{clientName}}.\n\nEn *NGSO Abogados S.A.S.* protegemos tu información personal de acuerdo con la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas sobre protección de datos personales vigentes en Colombia.\n\nAl continuar, autorizas de manera previa, expresa e informada el tratamiento de tus datos personales para fines de gestión de cobranza, contacto y seguimiento de tu caso, conforme a nuestra Política de Protección de Datos Personales.\n\nPor favor indica una opción:';
  
  const node1 = await createNode('Saludo y Autorización', 'message', {
    message: msgSaludo,
    useButtons: true,
    buttonTitle: 'Autorización de Datos',
    buttons: [
      { id: 'acepto', text: '✅ Acepto' },
      { id: 'no_acepto', text: '❌ No acepto' },
    ],
  });

  // NODO 2: Condición Autorización
  const node2 = await createNode('Verificar Autorización', 'condition', {
    variable: 'selected_button',
    conditions: [
      { variable: 'selected_button', operator: 'equals', value: 'acepto', nextNodeId: null },
      { variable: 'selected_button', operator: 'equals', value: 'no_acepto', nextNodeId: null },
    ],
  });

  // NODO 3: Autorización Aceptada
  const node3 = await createNode('Autorización Aceptada', 'message', {
    message: '✅ Gracias, {{clientName}}.\n\nHemos registrado tu autorización para el tratamiento de datos personales.\nAhora continuaremos con la validación de tu información para poder ayudarte con tu caso.',
  });

  // NODO 4: Autorización Rechazada
  const node4 = await createNode('Autorización Rechazada', 'message', {
    message: '❌ Entendemos tu decisión.\n\nSin embargo, te informamos que no podemos continuar con la gestión ni brindarte información sobre tu caso porque la autorización para el tratamiento de tus datos personales es *obligatoria* para prestar nuestros servicios, conforme a la normativa colombiana de protección de datos.\n\nSi en algún momento decides autorizar el tratamiento de tus datos, podrás volver a escribirnos y con gusto retomaremos la atención.',
  });

  // NODO 5: Fin por rechazo
  const node5 = await createNode('Fin - No Autorización', 'end', {});

  // NODO 6: Solicitar documento
  const node6 = await createNode('Solicitar Documento', 'input', {
    message: 'Para continuar con la validación de tu información, por favor indícanos tu *número de documento de identidad* (sin puntos ni comas).\n\n📝 Ejemplo: 123456789',
    inputType: 'text',
    variableName: 'documentNumber',
    validation: {
      required: true,
      minLength: 5,
      maxLength: 15,
      pattern: '^[0-9]+$',
      errorMessage: 'Por favor ingresa un número de documento válido (solo números, sin puntos ni comas).',
    },
  });

  // NODO 7: Verificar Deudor
  const node7 = await createNode('Verificar Deudor', 'condition', {
    variable: 'debtorFound',
    conditions: [
      { variable: 'debtorFound', operator: 'equals', value: true, nextNodeId: null },
      { variable: 'debtorFound', operator: 'equals', value: false, nextNodeId: null },
    ],
  });

  // NODO 8: Deudor Encontrado
  const node8 = await createNode('Deudor Encontrado', 'message', {
    message: '✅ Gracias.\n\nHemos encontrado una cuenta asociada al número de documento *{{documentNumber}}*:\n\n• *Nombre:* {{debtor.fullName}}\n• *Documento:* {{debtor.documentType}} {{debtor.documentNumber}}\n• *Estado actual:* {{debtor.status}}\n• *Saldo pendiente:* ${{debtor.debtAmount}}\n• *Días en mora:* {{debtor.daysOverdue}}\n\nA continuación, te comunicaremos con uno de nuestros asesores para revisar tu caso y ofrecerte alternativas de solución.',
  });

  // NODO 9: Deudor No Encontrado
  const node9 = await createNode('Deudor No Encontrado', 'message', {
    message: '⚠️ No hemos encontrado ninguna cuenta asociada al número de documento *{{documentNumber}}* en nuestra base de datos.\n\nTe vamos a trasladar con un asesor para que valide tu información y, si es necesario, registre tus datos correctamente en el sistema.',
  });

  // NODO 10: Mensaje de espera
  const node10 = await createNode('Espera Asignación', 'message', {
    message: '🔄 En este momento estamos asignando tu caso a uno de nuestros asesores disponibles.\n\n⏳ Por favor espera un momento mientras conectamos tu chat.\n\nTe notificaremos en este mismo canal cuando el asesor haya sido asignado.',
  });

  // NODO 11: Transferir a agente
  const node11 = await createNode('Transferir a Agente', 'transfer_agent', {
    message: '✅ Tu caso ha sido asignado a la cola de atención.\n\nUn asesor se pondrá en contacto contigo en breve.\n\nPor favor cuéntanos brevemente tu consulta o situación para poder ayudarte mejor.',
    transferReason: 'Validación de deudor completada - Transferencia automática',
  });

  return { nodes, node1, node2, node3, node4, node5, node6, node7, node8, node9, node10, node11 };
}

async function linkNodes(flowId, nodesInfo) {
  log('\n🔗 Conectando nodos...', 'cyan');

  const { node1, node2, node3, node4, node5, node6, node7, node8, node9, node10, node11 } = nodesInfo;
  
  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  // NODO 1 (Saludo) -> responseNodeId apunta a NODO 2 (Condición)
  log('  🔗 Saludo -> Verificar Autorización', 'yellow');
  await api.put(`/bot-flows/${flowId}/nodes/${node1.id}`, {
    config: {
      ...node1.config,
      responseNodeId: node2.id,
    },
  });

  // NODO 2 (Condición) -> acepto=NODO3, no_acepto=NODO4
  log('  🔗 Verificar Autorización -> Acepta/Rechaza', 'yellow');
  await api.put(`/bot-flows/${flowId}/nodes/${node2.id}`, {
    config: {
      variable: 'selected_button',
      conditions: [
        { variable: 'selected_button', operator: 'equals', value: 'acepto', nextNodeId: node3.id },
        { variable: 'selected_button', operator: 'equals', value: 'no_acepto', nextNodeId: node4.id },
      ],
      elseNodeId: node3.id,
    },
  });

  // NODO 3 (Acepta) -> NODO 6 (Solicitar documento)
  log('  🔗 Autorización Aceptada -> Solicitar Documento', 'yellow');
  await api.put(`/bot-flows/${flowId}/nodes/${node3.id}`, {
    nextNodeId: node6.id,
  });

  // NODO 4 (Rechaza) -> NODO 5 (Fin)
  log('  🔗 Autorización Rechazada -> Fin', 'yellow');
  await api.put(`/bot-flows/${flowId}/nodes/${node4.id}`, {
    nextNodeId: node5.id,
  });

  // NODO 6 (Solicitar documento) -> NODO 7 (Verificar Deudor)
  log('  🔗 Solicitar Documento -> Verificar Deudor', 'yellow');
  await api.put(`/bot-flows/${flowId}/nodes/${node6.id}`, {
    nextNodeId: node7.id,
  });

  // NODO 7 (Verificar Deudor) -> debtorFound=true -> NODO8, false -> NODO9
  log('  🔗 Verificar Deudor -> Encontrado/No Encontrado', 'yellow');
  await api.put(`/bot-flows/${flowId}/nodes/${node7.id}`, {
    config: {
      variable: 'debtorFound',
      conditions: [
        { variable: 'debtorFound', operator: 'equals', value: true, nextNodeId: node8.id },
        { variable: 'debtorFound', operator: 'equals', value: false, nextNodeId: node9.id },
      ],
      elseNodeId: node9.id,
    },
  });

  // NODO 8 (Deudor Encontrado) -> NODO 10 (Espera)
  log('  🔗 Deudor Encontrado -> Espera Asignación', 'yellow');
  await api.put(`/bot-flows/${flowId}/nodes/${node8.id}`, {
    nextNodeId: node10.id,
  });

  // NODO 9 (Deudor No Encontrado) -> NODO 10 (Espera)
  log('  🔗 Deudor No Encontrado -> Espera Asignación', 'yellow');
  await api.put(`/bot-flows/${flowId}/nodes/${node9.id}`, {
    nextNodeId: node10.id,
  });

  // NODO 10 (Espera) -> NODO 11 (Transferir)
  log('  🔗 Espera Asignación -> Transferir a Agente', 'yellow');
  await api.put(`/bot-flows/${flowId}/nodes/${node10.id}`, {
    nextNodeId: node11.id,
  });

  log('✅ Nodos conectados correctamente', 'green');
}

async function setStartNode(flowId, startNodeId) {
  log('\n🎯 Configurando nodo inicial...', 'cyan');
  
  await axios.put(
    `${API_URL}/bot-flows/${flowId}`,
    { startNodeId },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  log(`✅ Nodo inicial configurado: ${startNodeId}`, 'green');
}

async function publishFlow(flowId) {
  log('\n🚀 Publicando flujo...', 'cyan');
  
  await axios.put(
    `${API_URL}/bot-flows/${flowId}`,
    { status: 'active' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  log('✅ Flujo publicado y activo', 'green');
}

async function assignFlowToCampaign(flowId) {
  log('\n📊 Asignando flujo a campaña...', 'cyan');
  
  const campaignsResponse = await axios.get(
    `${API_URL}/campaigns`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  const campaigns = getData(campaignsResponse) || [];
  
  if (campaigns.length === 0) {
    log('⚠️ No hay campañas disponibles', 'yellow');
    return;
  }
  
  // Buscar campaña de prueba o usar la primera
  let targetCampaign = campaigns.find(c => 
    c.name.toLowerCase().includes('prueba') || 
    c.name.toLowerCase().includes('test')
  ) || campaigns[0];
  
  log(`  📋 Campaña seleccionada: ${targetCampaign.name}`, 'yellow');
  
  // Actualizar campaña con el nuevo flujo
  await axios.patch(
    `${API_URL}/campaigns/${targetCampaign.id}/settings`,
    {
      botEnabled: true,
      botFlowId: flowId,
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  log(`✅ Flujo asignado a campaña: ${targetCampaign.name}`, 'green');
  
  return targetCampaign;
}

async function assignFlowToWhatsAppNumber(flowId) {
  log('\n📱 Asignando flujo a número de WhatsApp...', 'cyan');
  
  const numbersResponse = await axios.get(
    `${API_URL}/whatsapp-numbers`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  const numbers = getData(numbersResponse) || [];
  
  if (numbers.length === 0) {
    log('⚠️ No hay números de WhatsApp disponibles', 'yellow');
    return;
  }
  
  // Buscar número de Twilio
  const twilioNumber = numbers.find(n => n.provider === 'twilio');
  
  if (!twilioNumber) {
    log('⚠️ No hay número de Twilio configurado', 'yellow');
    return;
  }
  
  log(`  📞 Número seleccionado: ${twilioNumber.phoneNumber} (${twilioNumber.displayName})`, 'yellow');
  
  // Actualizar número con el nuevo flujo
  await axios.patch(
    `${API_URL}/whatsapp-numbers/${twilioNumber.id}`,
    { botFlowId: flowId },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  log(`✅ Flujo asignado a número: ${twilioNumber.phoneNumber}`, 'green');
  
  return twilioNumber;
}

async function main() {
  try {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   CREAR FLUJO DE BOT NGSO - COBRANZA CON AUTORIZACIÓN');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n');
    
    await login();
    const flowId = await createFlow();
    const nodesInfo = await createNodes(flowId);
    await linkNodes(flowId, nodesInfo);
    await setStartNode(flowId, nodesInfo.node1.id);
    await publishFlow(flowId);
    
    // Asignar a campaña y número de WhatsApp
    const campaign = await assignFlowToCampaign(flowId);
    const whatsappNumber = await assignFlowToWhatsAppNumber(flowId);
    
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   ✅ FLUJO CREADO Y CONFIGURADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n   📋 Flow ID: ${flowId}`);
    if (campaign) {
      console.log(`   📊 Campaña: ${campaign.name}`);
    }
    if (whatsappNumber) {
      console.log(`   📱 WhatsApp: ${whatsappNumber.phoneNumber}`);
    }
    console.log('\n   📝 FLUJO DEL BOT:');
    console.log('   ┌─────────────────────────────────────────────────────────────┐');
    console.log('   │ 1. Saludo + Autorización de datos (botones)                 │');
    console.log('   │    ├─ ✅ Acepta → Solicitar documento                       │');
    console.log('   │    └─ ❌ No acepta → Fin de conversación                    │');
    console.log('   │ 2. Solicitar número de documento                            │');
    console.log('   │ 3. Buscar deudor en base de datos                           │');
    console.log('   │    ├─ ✅ Encontrado → Mostrar info + Transferir             │');
    console.log('   │    └─ ⚠️ No encontrado → Transferir para validar            │');
    console.log('   │ 4. Mensaje de espera                                        │');
    console.log('   │ 5. Transferencia a agente humano                            │');
    console.log('   └─────────────────────────────────────────────────────────────┘');
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
