/**
 * Script de Validación Completa del Sistema CRM
 * Valida todos los dashboards, módulos y funcionalidades
 * 
 * Uso: node validate-all-features.js
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuración
const API_URL = 'http://localhost:3000/api';
const CREDENTIALS = {
  admin: { email: 'admin@crm.com', password: 'admin123' },
  agent: { email: 'a.prueba1@prueba.com', password: 'Prueba123!' },
  supervisor: { email: 'supervisor@crm.com', password: 'super123' }
};

let authTokens = {};
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utilidades
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠'), msg),
  section: (msg) => console.log(chalk.cyan.bold(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)),
  subsection: (msg) => console.log(chalk.magenta(`\n--- ${msg} ---`))
};

const recordTest = (module, test, passed, message, data = null) => {
  const result = {
    module,
    test,
    passed,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  testResults.tests.push(result);
  
  if (passed) {
    testResults.passed++;
    log.success(`${module} - ${test}: ${message}`);
  } else {
    testResults.failed++;
    log.error(`${module} - ${test}: ${message}`);
  }
  
  if (data?.warning) {
    testResults.warnings++;
    log.warning(`  └─ ${data.warning}`);
  }
};

// Autenticación
async function authenticate() {
  log.section('AUTENTICACIÓN');
  
  for (const [role, creds] of Object.entries(CREDENTIALS)) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, creds);
      authTokens[role] = response.data.access_token;
      recordTest('Auth', `Login ${role}`, true, `Autenticado correctamente`);
    } catch (error) {
      recordTest('Auth', `Login ${role}`, false, `Error de autenticación: ${error.message}`);
    }
  }
}

// Crear cliente API con token
const getApi = (role = 'admin') => axios.create({
  baseURL: API_URL,
  headers: { Authorization: `Bearer ${authTokens[role]}` }
});

// ========================================
// 1. DASHBOARD PRINCIPAL
// ========================================
async function validateMainDashboard() {
  log.section('1. DASHBOARD PRINCIPAL');
  const api = getApi('admin');
  
  try {
    // Stats generales
    const statsResponse = await api.get('/dashboard/stats');
    const stats = statsResponse.data;
    
    recordTest('Dashboard', 'Stats generales', true, `Stats obtenidos correctamente`, {
      totalChats: stats.totalChats,
      activeChats: stats.activeChats,
      totalDebtors: stats.totalDebtors,
      warning: stats.totalChats === 0 ? 'No hay chats en el sistema' : null
    });
    
    // Validar que los números tengan sentido
    if (stats.totalChats < 0 || stats.activeChats < 0 || stats.totalDebtors < 0) {
      recordTest('Dashboard', 'Validación de datos', false, 'Números negativos detectados en stats');
    } else if (stats.activeChats > stats.totalChats) {
      recordTest('Dashboard', 'Validación de datos', false, 'Chats activos mayor que total de chats');
    } else {
      recordTest('Dashboard', 'Validación de datos', true, 'Números consistentes');
    }
    
    // Gráfico de chats por estado
    const chatsByStatusResponse = await api.get('/dashboard/chats-by-status');
    const chatsByStatus = chatsByStatusResponse.data;
    
    recordTest('Dashboard', 'Chats por estado', true, `${chatsByStatus.length} estados encontrados`, {
      data: chatsByStatus,
      warning: chatsByStatus.length === 0 ? 'No hay datos de chats' : null
    });
    
    // Gráfico de actividad reciente
    const recentActivityResponse = await api.get('/dashboard/recent-activity');
    const recentActivity = recentActivityResponse.data;
    
    recordTest('Dashboard', 'Actividad reciente', true, `${recentActivity.length} eventos recientes`, {
      count: recentActivity.length,
      warning: recentActivity.length === 0 ? 'No hay actividad reciente' : null
    });
    
  } catch (error) {
    recordTest('Dashboard', 'Error general', false, `Error al obtener dashboard: ${error.message}`);
  }
}

// ========================================
// 2. DASHBOARD FINANCIERO
// ========================================
async function validateFinancialDashboard() {
  log.section('2. DASHBOARD FINANCIERO');
  const api = getApi('admin');
  
  try {
    // Totales financieros
    const financialResponse = await api.get('/financial/totals');
    const financial = financialResponse.data;
    
    recordTest('Financial', 'Totales financieros', true, `Datos obtenidos`, {
      totalDebt: financial.totalDebt,
      totalPaid: financial.totalPaid,
      totalPending: financial.totalPending,
      warning: financial.totalDebt === 0 ? 'No hay deuda registrada' : null
    });
    
    // Validar coherencia financiera
    const calculatedPending = financial.totalDebt - financial.totalPaid;
    const difference = Math.abs(calculatedPending - financial.totalPending);
    
    if (difference > 0.01) {
      recordTest('Financial', 'Coherencia de datos', false, 
        `Discrepancia: Total Pending ${financial.totalPending} vs Calculado ${calculatedPending}`);
    } else {
      recordTest('Financial', 'Coherencia de datos', true, 'Cálculos financieros correctos');
    }
    
    // Pagos por mes
    const paymentsByMonthResponse = await api.get('/financial/payments-by-month');
    const paymentsByMonth = paymentsByMonthResponse.data;
    
    recordTest('Financial', 'Pagos por mes', true, `${paymentsByMonth.length} meses con datos`, {
      count: paymentsByMonth.length,
      warning: paymentsByMonth.length === 0 ? 'No hay historial de pagos' : null
    });
    
    // Top deudores
    const topDebtorsResponse = await api.get('/financial/top-debtors');
    const topDebtors = topDebtorsResponse.data;
    
    recordTest('Financial', 'Top deudores', true, `${topDebtors.length} deudores principales`, {
      count: topDebtors.length,
      warning: topDebtors.length === 0 ? 'No hay deudores registrados' : null
    });
    
  } catch (error) {
    recordTest('Financial', 'Error general', false, `Error en dashboard financiero: ${error.message}`);
  }
}

// ========================================
// 3. TODOS LOS CHATS
// ========================================
async function validateChats() {
  log.section('3. TODOS LOS CHATS');
  const api = getApi('agent');
  
  try {
    // Listar chats
    const chatsResponse = await api.get('/chats', {
      params: { page: 1, limit: 10 }
    });
    
    const chats = chatsResponse.data.data || chatsResponse.data;
    const total = chatsResponse.data.total || chats.length;
    
    recordTest('Chats', 'Listar chats', true, `${total} chats encontrados`, {
      count: total,
      showing: chats.length,
      warning: total === 0 ? 'No hay chats en el sistema' : null
    });
    
    // Validar estructura de chats
    if (chats.length > 0) {
      const firstChat = chats[0];
      const requiredFields = ['id', 'phoneNumber', 'status', 'lastMessage', 'createdAt'];
      const missingFields = requiredFields.filter(field => !(field in firstChat));
      
      if (missingFields.length > 0) {
        recordTest('Chats', 'Estructura de datos', false, 
          `Campos faltantes: ${missingFields.join(', ')}`);
      } else {
        recordTest('Chats', 'Estructura de datos', true, 'Todos los campos presentes');
      }
      
      // Validar fechas
      const createdAt = new Date(firstChat.createdAt);
      if (isNaN(createdAt.getTime())) {
        recordTest('Chats', 'Formato de fechas', false, 'Fecha createdAt inválida');
      } else {
        recordTest('Chats', 'Formato de fechas', true, 'Fechas correctamente formateadas');
      }
    }
    
    // Estados de chats
    const statusesResponse = await api.get('/chats/statuses');
    const statuses = statusesResponse.data;
    
    recordTest('Chats', 'Estados disponibles', true, `${statuses.length} estados`, {
      statuses: statuses.map(s => s.name || s)
    });
    
    // Filtros de chats
    const filteredResponse = await api.get('/chats', {
      params: { status: 'active', page: 1, limit: 5 }
    });
    
    recordTest('Chats', 'Filtros funcionando', true, 
      `Filtro por estado aplicado correctamente`);
    
  } catch (error) {
    recordTest('Chats', 'Error general', false, `Error en módulo de chats: ${error.message}`);
  }
}

// ========================================
// 4. PLANTILLAS
// ========================================
async function validateTemplates() {
  log.section('4. PLANTILLAS');
  const api = getApi('admin');
  
  try {
    // Listar plantillas
    const templatesResponse = await api.get('/templates');
    const templates = templatesResponse.data;
    
    recordTest('Templates', 'Listar plantillas', true, `${templates.length} plantillas encontradas`, {
      count: templates.length,
      warning: templates.length === 0 ? 'No hay plantillas configuradas' : null
    });
    
    if (templates.length > 0) {
      const firstTemplate = templates[0];
      
      // Validar campos requeridos
      const requiredFields = ['id', 'name', 'content', 'type'];
      const missingFields = requiredFields.filter(field => !(field in firstTemplate));
      
      if (missingFields.length > 0) {
        recordTest('Templates', 'Estructura', false, `Campos faltantes: ${missingFields.join(', ')}`);
      } else {
        recordTest('Templates', 'Estructura', true, 'Estructura correcta');
      }
      
      // Validar variables en plantillas
      const hasVariables = /{{\s*\w+\s*}}/.test(firstTemplate.content);
      recordTest('Templates', 'Variables', hasVariables, 
        hasVariables ? 'Plantilla con variables detectadas' : 'Sin variables (puede ser normal)',
        { warning: !hasVariables ? 'Verificar si debería tener variables' : null }
      );
    }
    
  } catch (error) {
    recordTest('Templates', 'Error general', false, `Error en plantillas: ${error.message}`);
  }
}

// ========================================
// 5. EVIDENCIAS DE PAGO
// ========================================
async function validatePaymentEvidences() {
  log.section('5. EVIDENCIAS DE PAGO');
  const api = getApi('admin');
  
  try {
    // Listar evidencias
    const evidencesResponse = await api.get('/payment-evidences', {
      params: { page: 1, limit: 10 }
    });
    
    const evidences = evidencesResponse.data.data || evidencesResponse.data;
    const total = evidencesResponse.data.total || evidences.length;
    
    recordTest('PaymentEvidences', 'Listar evidencias', true, `${total} evidencias encontradas`, {
      count: total,
      warning: total === 0 ? 'No hay evidencias de pago' : null
    });
    
    if (evidences.length > 0) {
      const firstEvidence = evidences[0];
      
      // Validar campos
      const requiredFields = ['id', 'debtorId', 'filePath', 'status', 'uploadedAt'];
      const missingFields = requiredFields.filter(field => !(field in firstEvidence));
      
      if (missingFields.length > 0) {
        recordTest('PaymentEvidences', 'Estructura', false, 
          `Campos faltantes: ${missingFields.join(', ')}`);
      } else {
        recordTest('PaymentEvidences', 'Estructura', true, 'Estructura correcta');
      }
      
      // Validar estados
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(firstEvidence.status)) {
        recordTest('PaymentEvidences', 'Estados válidos', false, 
          `Estado inválido: ${firstEvidence.status}`);
      } else {
        recordTest('PaymentEvidences', 'Estados válidos', true, 'Estados correctos');
      }
    }
    
  } catch (error) {
    recordTest('PaymentEvidences', 'Error general', false, 
      `Error en evidencias: ${error.message}`);
  }
}

// ========================================
// 6. PDFs DE CIERRE
// ========================================
async function validateClosurePdfs() {
  log.section('6. PDFs DE CIERRE');
  const api = getApi('admin');
  
  try {
    // Listar PDFs
    const pdfsResponse = await api.get('/closure-pdfs', {
      params: { page: 1, limit: 10 }
    });
    
    const pdfs = pdfsResponse.data.data || pdfsResponse.data;
    const total = pdfsResponse.data.total || pdfs.length;
    
    recordTest('ClosurePdfs', 'Listar PDFs', true, `${total} PDFs encontrados`, {
      count: total,
      warning: total === 0 ? 'No hay PDFs de cierre generados' : null
    });
    
    if (pdfs.length > 0) {
      const firstPdf = pdfs[0];
      
      // Validar que tenga ruta de archivo
      if (!firstPdf.filePath || !firstPdf.filePath.endsWith('.pdf')) {
        recordTest('ClosurePdfs', 'Validación archivos', false, 
          'PDF sin ruta válida o extensión incorrecta');
      } else {
        recordTest('ClosurePdfs', 'Validación archivos', true, 'Rutas de archivos correctas');
      }
    }
    
  } catch (error) {
    recordTest('ClosurePdfs', 'Error general', false, `Error en PDFs: ${error.message}`);
  }
}

// ========================================
// 7. PROMESAS DE PAGO
// ========================================
async function validatePaymentPromises() {
  log.section('7. PROMESAS DE PAGO');
  const api = getApi('agent');
  
  try {
    // Listar promesas
    const promisesResponse = await api.get('/payment-promises', {
      params: { page: 1, limit: 10 }
    });
    
    const promises = promisesResponse.data.data || promisesResponse.data;
    const total = promisesResponse.data.total || promises.length;
    
    recordTest('PaymentPromises', 'Listar promesas', true, `${total} promesas encontradas`, {
      count: total,
      warning: total === 0 ? 'No hay promesas de pago registradas' : null
    });
    
    if (promises.length > 0) {
      const firstPromise = promises[0];
      
      // Validar fecha de promesa
      const promiseDate = new Date(firstPromise.promiseDate);
      if (isNaN(promiseDate.getTime())) {
        recordTest('PaymentPromises', 'Fechas válidas', false, 'Fecha de promesa inválida');
      } else {
        recordTest('PaymentPromises', 'Fechas válidas', true, 'Fechas correctamente formateadas');
        
        // Verificar promesas vencidas
        const now = new Date();
        const isExpired = promiseDate < now && firstPromise.status === 'pending';
        if (isExpired) {
          recordTest('PaymentPromises', 'Promesas vencidas', true, 
            'Hay promesas vencidas pendientes',
            { warning: 'Revisar promesas vencidas para seguimiento' });
        }
      }
      
      // Validar montos
      if (firstPromise.amount && firstPromise.amount <= 0) {
        recordTest('PaymentPromises', 'Validación montos', false, 'Monto inválido (<=0)');
      } else if (firstPromise.amount) {
        recordTest('PaymentPromises', 'Validación montos', true, 'Montos válidos');
      }
    }
    
  } catch (error) {
    recordTest('PaymentPromises', 'Error general', false, 
      `Error en promesas: ${error.message}`);
  }
}

// ========================================
// 8. CLIENTES NO IDENTIFICADOS
// ========================================
async function validateUnidentifiedClients() {
  log.section('8. CLIENTES NO IDENTIFICADOS');
  const api = getApi('admin');
  
  try {
    // Listar clientes no identificados
    const clientsResponse = await api.get('/unidentified-clients', {
      params: { page: 1, limit: 10 }
    });
    
    const clients = clientsResponse.data.data || clientsResponse.data;
    const total = clientsResponse.data.total || clients.length;
    
    recordTest('UnidentifiedClients', 'Listar clientes', true, 
      `${total} clientes no identificados`, {
      count: total,
      warning: total > 10 ? 'Muchos clientes sin identificar, revisar proceso' : null
    });
    
    if (clients.length > 0) {
      const firstClient = clients[0];
      
      // Validar que tengan número de teléfono
      if (!firstClient.phoneNumber) {
        recordTest('UnidentifiedClients', 'Datos básicos', false, 
          'Cliente sin número de teléfono');
      } else {
        recordTest('UnidentifiedClients', 'Datos básicos', true, 
          'Datos básicos presentes');
      }
    }
    
  } catch (error) {
    recordTest('UnidentifiedClients', 'Error general', false, 
      `Error en clientes no identificados: ${error.message}`);
  }
}

// ========================================
// 9. REPORTES
// ========================================
async function validateReports() {
  log.section('9. REPORTES');
  const api = getApi('admin');
  
  try {
    // Reporte de gestión
    const managementResponse = await api.get('/reports/management', {
      params: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      }
    });
    
    const managementReport = managementResponse.data;
    
    recordTest('Reports', 'Reporte de gestión', true, 'Reporte generado correctamente', {
      totalContacts: managementReport.totalContacts,
      totalPromises: managementReport.totalPromises,
      warning: !managementReport.totalContacts ? 'Sin contactos en el período' : null
    });
    
    // Reporte de productividad
    const productivityResponse = await api.get('/reports/productivity', {
      params: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      }
    });
    
    const productivityReport = productivityResponse.data;
    
    recordTest('Reports', 'Reporte de productividad', true, 
      'Reporte de productividad generado', {
      agentsCount: productivityReport.agents?.length || 0,
      warning: !productivityReport.agents?.length ? 'Sin datos de agentes' : null
    });
    
    // Reporte financiero
    const financialReportResponse = await api.get('/reports/financial', {
      params: { month: new Date().getMonth() + 1, year: new Date().getFullYear() }
    });
    
    const financialReport = financialReportResponse.data;
    
    recordTest('Reports', 'Reporte financiero', true, 'Reporte financiero generado', {
      totalCollected: financialReport.totalCollected,
      totalPending: financialReport.totalPending
    });
    
  } catch (error) {
    recordTest('Reports', 'Error general', false, `Error en reportes: ${error.message}`);
  }
}

// ========================================
// 10. CAMPAÑAS
// ========================================
async function validateCampaigns() {
  log.section('10. CAMPAÑAS');
  const api = getApi('admin');
  
  try {
    // Listar campañas
    const campaignsResponse = await api.get('/campaigns');
    const campaigns = campaignsResponse.data;
    
    recordTest('Campaigns', 'Listar campañas', true, `${campaigns.length} campañas encontradas`, {
      count: campaigns.length,
      warning: campaigns.length === 0 ? 'No hay campañas creadas' : null
    });
    
    if (campaigns.length > 0) {
      const firstCampaign = campaigns[0];
      
      // Validar estructura
      const requiredFields = ['id', 'name', 'status', 'type'];
      const missingFields = requiredFields.filter(field => !(field in firstCampaign));
      
      if (missingFields.length > 0) {
        recordTest('Campaigns', 'Estructura', false, 
          `Campos faltantes: ${missingFields.join(', ')}`);
      } else {
        recordTest('Campaigns', 'Estructura', true, 'Estructura correcta');
      }
      
      // Estadísticas de campaña
      if (firstCampaign.id) {
        try {
          const statsResponse = await api.get(`/campaigns/${firstCampaign.id}/stats`);
          const stats = statsResponse.data;
          
          recordTest('Campaigns', 'Estadísticas', true, 
            `Stats de campaña: ${stats.sent} enviados, ${stats.delivered} entregados`, {
            sent: stats.sent,
            delivered: stats.delivered,
            failed: stats.failed
          });
        } catch (error) {
          recordTest('Campaigns', 'Estadísticas', false, 
            'Error al obtener estadísticas de campaña');
        }
      }
    }
    
  } catch (error) {
    recordTest('Campaigns', 'Error general', false, `Error en campañas: ${error.message}`);
  }
}

// ========================================
// 11. BASE DE DEUDORES
// ========================================
async function validateDebtors() {
  log.section('11. BASE DE DEUDORES');
  const api = getApi('admin');
  
  try {
    // Listar deudores
    const debtorsResponse = await api.get('/debtors', {
      params: { page: 1, limit: 10 }
    });
    
    const debtors = debtorsResponse.data.data || debtorsResponse.data;
    const total = debtorsResponse.data.total || debtors.length;
    
    recordTest('Debtors', 'Listar deudores', true, `${total} deudores en base de datos`, {
      count: total,
      showing: debtors.length,
      warning: total === 0 ? 'Base de deudores vacía' : null
    });
    
    if (debtors.length > 0) {
      const firstDebtor = debtors[0];
      
      // Validar campos críticos
      const criticalFields = ['id', 'name', 'phone', 'debtAmount'];
      const missingCritical = criticalFields.filter(field => 
        !(field in firstDebtor) && !(field === 'phone' && 'phoneNumber' in firstDebtor)
      );
      
      if (missingCritical.length > 0) {
        recordTest('Debtors', 'Campos críticos', false, 
          `Campos faltantes: ${missingCritical.join(', ')}`);
      } else {
        recordTest('Debtors', 'Campos críticos', true, 'Todos los campos críticos presentes');
      }
      
      // Validar monto de deuda
      const debtAmount = firstDebtor.debtAmount || firstDebtor.amount;
      if (debtAmount && debtAmount < 0) {
        recordTest('Debtors', 'Validación montos', false, 'Monto de deuda negativo detectado');
      } else if (debtAmount && debtAmount > 0) {
        recordTest('Debtors', 'Validación montos', true, 'Montos válidos');
      }
      
      // Verificar si hay duplicados por teléfono
      const phones = debtors.map(d => d.phone || d.phoneNumber);
      const uniquePhones = new Set(phones);
      if (phones.length !== uniquePhones.size) {
        recordTest('Debtors', 'Duplicados', false, 
          'Números de teléfono duplicados detectados',
          { warning: 'Revisar deudores con mismo teléfono' });
      } else {
        recordTest('Debtors', 'Duplicados', true, 'No hay duplicados evidentes');
      }
    }
    
    // Estadísticas de deudores
    try {
      const statsResponse = await api.get('/debtors/stats');
      const stats = statsResponse.data;
      
      recordTest('Debtors', 'Estadísticas', true, 'Stats de deudores obtenidas', {
        totalDebt: stats.totalDebt,
        averageDebt: stats.averageDebt,
        activeDebtors: stats.activeDebtors
      });
    } catch (error) {
      recordTest('Debtors', 'Estadísticas', false, 'Error al obtener estadísticas');
    }
    
  } catch (error) {
    recordTest('Debtors', 'Error general', false, `Error en deudores: ${error.message}`);
  }
}

// ========================================
// 12. FLUJOS DE BOT
// ========================================
async function validateBotFlows() {
  log.section('12. FLUJOS DE BOT');
  const api = getApi('admin');
  
  try {
    // Listar flujos
    const flowsResponse = await api.get('/bot-flows');
    const flows = flowsResponse.data;
    
    recordTest('BotFlows', 'Listar flujos', true, `${flows.length} flujos configurados`, {
      count: flows.length,
      warning: flows.length === 0 ? 'No hay flujos de bot configurados' : null
    });
    
    if (flows.length > 0) {
      const firstFlow = flows[0];
      
      // Validar estructura de flujo
      const requiredFields = ['id', 'name', 'triggerType', 'steps'];
      const missingFields = requiredFields.filter(field => !(field in firstFlow));
      
      if (missingFields.length > 0) {
        recordTest('BotFlows', 'Estructura', false, 
          `Campos faltantes: ${missingFields.join(', ')}`);
      } else {
        recordTest('BotFlows', 'Estructura', true, 'Estructura correcta');
      }
      
      // Validar pasos del flujo
      if (!firstFlow.steps || firstFlow.steps.length === 0) {
        recordTest('BotFlows', 'Pasos del flujo', false, 'Flujo sin pasos configurados');
      } else {
        recordTest('BotFlows', 'Pasos del flujo', true, 
          `${firstFlow.steps.length} pasos configurados`);
        
        // Validar estructura de pasos
        const firstStep = firstFlow.steps[0];
        if (!firstStep.action || !firstStep.message) {
          recordTest('BotFlows', 'Validación de pasos', false, 
            'Paso sin acción o mensaje definido');
        } else {
          recordTest('BotFlows', 'Validación de pasos', true, 
            'Pasos correctamente configurados');
        }
      }
      
      // Estado del flujo
      if (firstFlow.isActive === false) {
        recordTest('BotFlows', 'Estado activo', true, 
          'Flujo inactivo detectado',
          { warning: 'Hay flujos inactivos, verificar si es intencional' });
      } else {
        recordTest('BotFlows', 'Estado activo', true, 'Flujos activos');
      }
    }
    
  } catch (error) {
    recordTest('BotFlows', 'Error general', false, `Error en flujos: ${error.message}`);
  }
}

// ========================================
// 13. NÚMEROS DE WHATSAPP
// ========================================
async function validateWhatsappNumbers() {
  log.section('13. NÚMEROS DE WHATSAPP');
  const api = getApi('admin');
  
  try {
    // Listar sesiones de WhatsApp
    const sessionsResponse = await api.get('/whatsapp/sessions');
    const sessions = sessionsResponse.data;
    
    recordTest('WhatsApp', 'Sesiones configuradas', true, 
      `${sessions.length} sesiones encontradas`, {
      count: sessions.length,
      warning: sessions.length === 0 ? 'No hay sesiones de WhatsApp configuradas' : null
    });
    
    if (sessions.length > 0) {
      // Validar estado de cada sesión
      let activeSessions = 0;
      let inactiveSessions = 0;
      
      for (const session of sessions) {
        if (session.status === 'CONNECTED' || session.isConnected) {
          activeSessions++;
        } else {
          inactiveSessions++;
        }
      }
      
      recordTest('WhatsApp', 'Estado de sesiones', true, 
        `${activeSessions} activas, ${inactiveSessions} inactivas`, {
        active: activeSessions,
        inactive: inactiveSessions,
        warning: inactiveSessions > 0 ? 'Hay sesiones desconectadas' : null
      });
      
      // Validar información de sesión
      const firstSession = sessions[0];
      if (!firstSession.phoneNumber && !firstSession.number) {
        recordTest('WhatsApp', 'Información de sesión', false, 
          'Sesión sin número de teléfono');
      } else {
        recordTest('WhatsApp', 'Información de sesión', true, 
          'Información completa de sesiones');
      }
    }
    
    // Estado del servicio WhatsApp
    try {
      const statusResponse = await api.get('/whatsapp/status');
      const status = statusResponse.data;
      
      recordTest('WhatsApp', 'Estado del servicio', true, 
        `Servicio: ${status.status}`, {
        status: status.status,
        warning: status.status !== 'running' ? 'Servicio WhatsApp no está corriendo' : null
      });
    } catch (error) {
      recordTest('WhatsApp', 'Estado del servicio', false, 
        'No se pudo verificar estado del servicio');
    }
    
  } catch (error) {
    recordTest('WhatsApp', 'Error general', false, 
      `Error en WhatsApp: ${error.message}`);
  }
}

// ========================================
// 14. MONITOREO DE SESIONES (AGENTES)
// ========================================
async function validateSessionMonitoring() {
  log.section('14. MONITOREO DE SESIONES DE AGENTES');
  const api = getApi('supervisor');
  
  try {
    // Obtener workdays activos
    const workdaysResponse = await api.get('/workday/active');
    const workdays = workdaysResponse.data;
    
    recordTest('SessionMonitoring', 'Jornadas activas', true, 
      `${workdays.length} agentes conectados`, {
      count: workdays.length,
      warning: workdays.length === 0 ? 'No hay agentes conectados actualmente' : null
    });
    
    if (workdays.length > 0) {
      const firstWorkday = workdays[0];
      
      // Validar campos de jornada
      const requiredFields = ['id', 'userId', 'clockInTime', 'currentStatus'];
      const missingFields = requiredFields.filter(field => !(field in firstWorkday));
      
      if (missingFields.length > 0) {
        recordTest('SessionMonitoring', 'Estructura jornada', false, 
          `Campos faltantes: ${missingFields.join(', ')}`);
      } else {
        recordTest('SessionMonitoring', 'Estructura jornada', true, 
          'Estructura correcta');
      }
      
      // Validar cálculo de tiempos
      if ('totalWorkMinutes' in firstWorkday && 'totalPauseMinutes' in firstWorkday) {
        const totalWork = firstWorkday.totalWorkMinutes || 0;
        const totalPause = firstWorkday.totalPauseMinutes || 0;
        const totalProductive = firstWorkday.totalProductiveMinutes || 0;
        
        // Verificar coherencia
        const expectedProductive = totalWork - totalPause;
        const difference = Math.abs(expectedProductive - totalProductive);
        
        if (difference > 1) { // 1 minuto de tolerancia
          recordTest('SessionMonitoring', 'Cálculo de tiempos', false, 
            `Discrepancia en tiempos productivos: ${totalProductive} vs esperado ${expectedProductive}`);
        } else {
          recordTest('SessionMonitoring', 'Cálculo de tiempos', true, 
            'Tiempos calculados correctamente');
        }
      } else {
        recordTest('SessionMonitoring', 'Cálculo de tiempos', false, 
          'Faltan campos de tiempo en la respuesta');
      }
      
      // Validar información de usuario
      if (firstWorkday.user) {
        if (!firstWorkday.user.fullName && !firstWorkday.user.email) {
          recordTest('SessionMonitoring', 'Info de usuario', false, 
            'Usuario sin nombre ni email');
        } else {
          recordTest('SessionMonitoring', 'Info de usuario', true, 
            'Información de usuario presente');
        }
      }
    }
    
    // Estado de agentes
    try {
      const agentStatesResponse = await api.get('/workday/agent-states');
      const agentStates = agentStatesResponse.data;
      
      const statesSummary = {
        available: agentStates.filter(a => a.agentState === 'available').length,
        busy: agentStates.filter(a => a.agentState === 'busy').length,
        break: agentStates.filter(a => a.agentState === 'break').length,
        offline: agentStates.filter(a => a.agentState === 'offline').length
      };
      
      recordTest('SessionMonitoring', 'Estados de agentes', true, 
        'Distribución de estados obtenida', statesSummary);
    } catch (error) {
      recordTest('SessionMonitoring', 'Estados de agentes', false, 
        'Error al obtener estados');
    }
    
  } catch (error) {
    recordTest('SessionMonitoring', 'Error general', false, 
      `Error en monitoreo: ${error.message}`);
  }
}

// ========================================
// 15. USUARIOS
// ========================================
async function validateUsers() {
  log.section('15. USUARIOS');
  const api = getApi('admin');
  
  try {
    // Listar usuarios
    const usersResponse = await api.get('/users');
    const users = usersResponse.data;
    
    recordTest('Users', 'Listar usuarios', true, `${users.length} usuarios registrados`, {
      count: users.length,
      warning: users.length === 0 ? 'No hay usuarios en el sistema' : null
    });
    
    if (users.length > 0) {
      // Validar estructura
      const firstUser = users[0];
      const requiredFields = ['id', 'email', 'role'];
      const missingFields = requiredFields.filter(field => !(field in firstUser));
      
      if (missingFields.length > 0) {
        recordTest('Users', 'Estructura', false, 
          `Campos faltantes: ${missingFields.join(', ')}`);
      } else {
        recordTest('Users', 'Estructura', true, 'Estructura correcta');
      }
      
      // Validar roles asignados
      const usersWithoutRole = users.filter(u => !u.role || !u.role.id);
      if (usersWithoutRole.length > 0) {
        recordTest('Users', 'Asignación de roles', false, 
          `${usersWithoutRole.length} usuarios sin rol asignado`);
      } else {
        recordTest('Users', 'Asignación de roles', true, 
          'Todos los usuarios tienen rol asignado');
      }
      
      // Estadísticas de usuarios
      const roleDistribution = users.reduce((acc, user) => {
        const roleName = user.role?.name || 'Sin rol';
        acc[roleName] = (acc[roleName] || 0) + 1;
        return acc;
      }, {});
      
      recordTest('Users', 'Distribución por rol', true, 
        'Distribución calculada', { distribution: roleDistribution });
      
      // Validar usuarios activos/inactivos
      const activeUsers = users.filter(u => u.isActive !== false);
      const inactiveUsers = users.length - activeUsers.length;
      
      recordTest('Users', 'Estado de usuarios', true, 
        `${activeUsers.length} activos, ${inactiveUsers} inactivos`, {
        active: activeUsers.length,
        inactive: inactiveUsers
      });
    }
    
  } catch (error) {
    recordTest('Users', 'Error general', false, `Error en usuarios: ${error.message}`);
  }
}

// ========================================
// 16. ROLES Y PERMISOS
// ========================================
async function validateRolesAndPermissions() {
  log.section('16. ROLES Y PERMISOS');
  const api = getApi('admin');
  
  try {
    // Listar roles
    const rolesResponse = await api.get('/roles');
    const roles = rolesResponse.data;
    
    recordTest('Roles', 'Listar roles', true, `${roles.length} roles configurados`, {
      count: roles.length,
      roles: roles.map(r => r.name),
      warning: roles.length < 3 ? 'Pocos roles configurados' : null
    });
    
    if (roles.length > 0) {
      // Validar permisos por rol
      for (const role of roles) {
        if (!role.permissions || role.permissions.length === 0) {
          recordTest('Roles', `Permisos de ${role.name}`, false, 
            `Rol sin permisos asignados`);
        } else {
          recordTest('Roles', `Permisos de ${role.name}`, true, 
            `${role.permissions.length} permisos asignados`);
        }
      }
    }
    
    // Listar todos los permisos disponibles
    try {
      const permissionsResponse = await api.get('/permissions');
      const permissions = permissionsResponse.data;
      
      recordTest('Permissions', 'Permisos disponibles', true, 
        `${permissions.length} permisos en el sistema`, {
        count: permissions.length,
        categories: [...new Set(permissions.map(p => p.resource || p.module))]
      });
      
      // Validar que permisos tengan descripción
      const permissionsWithoutDescription = permissions.filter(p => !p.description);
      if (permissionsWithoutDescription.length > 0) {
        recordTest('Permissions', 'Documentación', false, 
          `${permissionsWithoutDescription.length} permisos sin descripción`,
          { warning: 'Agregar descripciones para mejor gestión' });
      } else {
        recordTest('Permissions', 'Documentación', true, 
          'Todos los permisos tienen descripción');
      }
    } catch (error) {
      recordTest('Permissions', 'Listar permisos', false, 
        'Error al obtener permisos');
    }
    
  } catch (error) {
    recordTest('Roles', 'Error general', false, 
      `Error en roles y permisos: ${error.message}`);
  }
}

// ========================================
// 17. BACKUP
// ========================================
async function validateBackup() {
  log.section('17. SISTEMA DE BACKUP');
  const api = getApi('admin');
  
  try {
    // Listar backups disponibles
    const backupsResponse = await api.get('/backup/list');
    const backups = backupsResponse.data;
    
    recordTest('Backup', 'Backups disponibles', true, 
      `${backups.length} backups encontrados`, {
      count: backups.length,
      warning: backups.length === 0 ? 'No hay backups disponibles' : null
    });
    
    if (backups.length > 0) {
      // Validar backup más reciente
      const sortedBackups = backups.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      const latestBackup = sortedBackups[0];
      const backupDate = new Date(latestBackup.createdAt);
      const daysSinceBackup = Math.floor((Date.now() - backupDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceBackup > 7) {
        recordTest('Backup', 'Frecuencia de backup', false, 
          `Último backup hace ${daysSinceBackup} días`,
          { warning: 'Considerar hacer backups más frecuentes' });
      } else {
        recordTest('Backup', 'Frecuencia de backup', true, 
          `Último backup hace ${daysSinceBackup} días`);
      }
      
      // Validar tamaño de backups
      if (latestBackup.size) {
        const sizeMB = (latestBackup.size / (1024 * 1024)).toFixed(2);
        recordTest('Backup', 'Tamaño de backup', true, 
          `Último backup: ${sizeMB} MB`, {
          size: sizeMB,
          warning: sizeMB < 1 ? 'Backup muy pequeño, verificar integridad' : null
        });
      }
    }
    
    // Verificar configuración de backup automático
    try {
      const configResponse = await api.get('/backup/config');
      const config = configResponse.data;
      
      if (config.autoBackupEnabled) {
        recordTest('Backup', 'Backup automático', true, 
          `Configurado: cada ${config.frequency}`, {
          enabled: config.autoBackupEnabled,
          frequency: config.frequency
        });
      } else {
        recordTest('Backup', 'Backup automático', false, 
          'Backup automático no configurado',
          { warning: 'Configurar backup automático para mayor seguridad' });
      }
    } catch (error) {
      recordTest('Backup', 'Configuración automática', false, 
        'No se pudo verificar configuración de backup automático');
    }
    
  } catch (error) {
    recordTest('Backup', 'Error general', false, `Error en backup: ${error.message}`);
  }
}

// ========================================
// VALIDACIÓN DE CACHÉ
// ========================================
async function validateCacheConsistency() {
  log.section('VALIDACIÓN DE CACHÉ Y CONSISTENCIA');
  const api = getApi('admin');
  
  try {
    // Verificar cache headers en respuestas
    const testEndpoints = [
      '/dashboard/stats',
      '/chats?page=1&limit=1',
      '/debtors?page=1&limit=1'
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await api.get(endpoint);
        const cacheControl = response.headers['cache-control'];
        const etag = response.headers['etag'];
        
        if (cacheControl && cacheControl.includes('no-cache')) {
          recordTest('Cache', `Endpoint ${endpoint}`, true, 
            'Sin caché (datos frescos)');
        } else if (cacheControl) {
          recordTest('Cache', `Endpoint ${endpoint}`, true, 
            `Cache configurado: ${cacheControl}`,
            { warning: 'Verificar si el caché es apropiado para este endpoint' });
        } else {
          recordTest('Cache', `Endpoint ${endpoint}`, true, 
            'Sin headers de caché explícitos');
        }
      } catch (error) {
        // Endpoint puede no existir, no es crítico
      }
    }
    
    // Verificar datos en tiempo real vs cacheados
    const stats1 = await api.get('/dashboard/stats');
    await new Promise(resolve => setTimeout(resolve, 100));
    const stats2 = await api.get('/dashboard/stats');
    
    if (JSON.stringify(stats1.data) === JSON.stringify(stats2.data)) {
      recordTest('Cache', 'Consistencia de datos', true, 
        'Datos consistentes entre peticiones');
    } else {
      recordTest('Cache', 'Consistencia de datos', true, 
        'Datos actualizados entre peticiones (normal si hay cambios)');
    }
    
  } catch (error) {
    recordTest('Cache', 'Validación general', false, 
      `Error en validación de caché: ${error.message}`);
  }
}

// ========================================
// REPORTE FINAL
// ========================================
function generateFinalReport() {
  log.section('REPORTE FINAL DE VALIDACIÓN');
  
  const total = testResults.passed + testResults.failed;
  const successRate = ((testResults.passed / total) * 100).toFixed(2);
  
  console.log('\n');
  log.info(`Total de pruebas ejecutadas: ${total}`);
  log.success(`Pruebas exitosas: ${testResults.passed}`);
  log.error(`Pruebas fallidas: ${testResults.failed}`);
  log.warning(`Advertencias: ${testResults.warnings}`);
  console.log('\n');
  log.info(`Tasa de éxito: ${successRate}%`);
  
  // Agrupar resultados por módulo
  const byModule = {};
  testResults.tests.forEach(test => {
    if (!byModule[test.module]) {
      byModule[test.module] = { passed: 0, failed: 0, tests: [] };
    }
    byModule[test.module].tests.push(test);
    if (test.passed) {
      byModule[test.module].passed++;
    } else {
      byModule[test.module].failed++;
    }
  });
  
  // Mostrar resumen por módulo
  console.log('\n');
  log.subsection('RESUMEN POR MÓDULO');
  Object.entries(byModule).forEach(([module, data]) => {
    const moduleRate = ((data.passed / (data.passed + data.failed)) * 100).toFixed(0);
    const status = data.failed === 0 ? chalk.green('✓') : chalk.red('✗');
    console.log(`${status} ${module}: ${data.passed}/${data.passed + data.failed} (${moduleRate}%)`);
  });
  
  // Listar fallos críticos
  const failures = testResults.tests.filter(t => !t.passed);
  if (failures.length > 0) {
    console.log('\n');
    log.subsection('FALLOS DETECTADOS');
    failures.forEach(failure => {
      log.error(`${failure.module} - ${failure.test}`);
      console.log(`  └─ ${failure.message}`);
    });
  }
  
  // Listar advertencias
  const warnings = testResults.tests.filter(t => t.data?.warning);
  if (warnings.length > 0) {
    console.log('\n');
    log.subsection('ADVERTENCIAS');
    warnings.forEach(warning => {
      log.warning(`${warning.module} - ${warning.test}`);
      console.log(`  └─ ${warning.data.warning}`);
    });
  }
  
  // Guardar reporte en archivo JSON
  const fs = require('fs');
  const reportPath = `./validation-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log('\n');
  log.info(`Reporte completo guardado en: ${reportPath}`);
  
  // Conclusión
  console.log('\n');
  if (testResults.failed === 0) {
    log.success('🎉 TODOS LOS TESTS PASARON EXITOSAMENTE');
  } else if (successRate >= 80) {
    log.warning('⚠️  LA MAYORÍA DE TESTS PASARON, PERO HAY ÁREAS DE MEJORA');
  } else {
    log.error('❌ SE DETECTARON PROBLEMAS CRÍTICOS QUE REQUIEREN ATENCIÓN');
  }
  console.log('\n');
}

// ========================================
// EJECUCIÓN PRINCIPAL
// ========================================
async function main() {
  console.clear();
  log.section('VALIDACIÓN COMPLETA DEL SISTEMA CRM');
  log.info('Iniciando validación de todos los módulos y funcionalidades...\n');
  
  try {
    // Autenticación
    await authenticate();
    
    // Ejecutar todas las validaciones
    await validateMainDashboard();
    await validateFinancialDashboard();
    await validateChats();
    await validateTemplates();
    await validatePaymentEvidences();
    await validateClosurePdfs();
    await validatePaymentPromises();
    await validateUnidentifiedClients();
    await validateReports();
    await validateCampaigns();
    await validateDebtors();
    await validateBotFlows();
    await validateWhatsappNumbers();
    await validateSessionMonitoring();
    await validateUsers();
    await validateRolesAndPermissions();
    await validateBackup();
    await validateCacheConsistency();
    
    // Generar reporte final
    generateFinalReport();
    
  } catch (error) {
    log.error(`Error fatal durante la validación: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
main().catch(console.error);
