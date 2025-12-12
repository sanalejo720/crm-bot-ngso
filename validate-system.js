#!/usr/bin/env node
/**
 * Script de Validación Completa del Sistema CRM
 * Ejecutar directamente en el servidor VPS
 * node validate-system.js
 */

const axios = require('axios');

// Configuración
const API_URL = 'http://localhost:3000/api/v1';
const CREDENTIALS = {
  email: 'admin@assoftware.xyz',
  password: 'password123'
};

let token = null;
let stats = { passed: 0, failed: 0, warnings: 0 };

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(type, message) {
  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  const typeColors = { success: 'green', error: 'red', warning: 'yellow', info: 'blue' };
  console.log(`${colors[typeColors[type]]}${icons[type]} ${message}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}\n${title}\n${'='.repeat(60)}${colors.reset}`);
}

function test(name, passed, msg, warn = null) {
  if (passed) {
    stats.passed++;
    log('success', `${name}: ${msg}`);
  } else {
    stats.failed++;
    log('error', `${name}: ${msg}`);
  }
  if (warn) {
    stats.warnings++;
    log('warning', `  └─ ${warn}`);
  }
}

async function request(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 10000
    };
    if (data) config.data = data;
    if (method === 'GET' && data) config.params = data;
    
    const response = await axios(config);
    return { ok: true, data: response.data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function authenticate() {
  section('AUTENTICACIÓN');
  const result = await request('POST', '/auth/login', CREDENTIALS);
  if (result.ok) {
    token = result.data.data.accessToken || result.data.accessToken || result.data.access_token;
    test('Login', true, `Autenticado como ${result.data.data.user.fullName}`);
    return true;
  } else {
    test('Login', false, `Error: ${result.error}`);
    return false;
  }
}

async function checkDashboard() {
  section('DASHBOARD PRINCIPAL');
  const result = await request('GET', '/dashboard/stats');
  if (result.ok) {
    const d = result.data;
    test('Stats', true, `Chats: ${d.totalChats || 0}, Deudores: ${d.totalDebtors || 0}`,
      d.totalChats === 0 ? 'Sin chats' : null);
  } else {
    test('Stats', false, result.error);
  }
}

async function checkChats() {
  section('GESTIÓN DE CHATS');
  const result = await request('GET', '/chats', { page: 1, limit: 5 });
  if (result.ok) {
    const chats = result.data.data || result.data;
    test('Listar', true, `${chats.length} chats`,
      chats.length === 0 ? 'Sin chats' : null);
    
    if (chats.length > 0 && chats[0].lastMessage) {
      test('Estructura', true, 'Campos completos');
    }
  } else {
    test('Listar', false, result.error);
  }
}

async function checkDebtors() {
  section('BASE DE DEUDORES');
  const result = await request('GET', '/debtors', { page: 1, limit: 5 });
  if (result.ok) {
    const debtors = result.data.data || result.data;
    const total = result.data.total || debtors.length;
    test('Listar', true, `${total} deudores`,
      total === 0 ? 'Base vacía' : null);
    
    if (debtors.length > 0) {
      const d = debtors[0];
      test('Datos', !!(d.name && d.phone), 
        d.name && d.phone ? 'Campos OK' : 'Faltan campos');
    }
  } else {
    test('Listar', false, result.error);
  }
}

async function checkTemplates() {
  section('PLANTILLAS');
  const result = await request('GET', '/templates');
  if (result.ok) {
    test('Listar', true, `${result.data.length} plantillas`,
      result.data.length === 0 ? 'Sin plantillas' : null);
  } else {
    test('Listar', false, result.error);
  }
}

async function checkCampaigns() {
  section('CAMPAÑAS');
  const result = await request('GET', '/campaigns');
  if (result.ok) {
    test('Listar', true, `${result.data.length} campañas`,
      result.data.length === 0 ? 'Sin campañas' : null);
  } else {
    test('Listar', false, result.error);
  }
}

async function checkBotFlows() {
  section('FLUJOS DE BOT');
  const result = await request('GET', '/bot-flows');
  if (result.ok) {
    const flows = result.data;
    test('Listar', true, `${flows.length} flujos`,
      flows.length === 0 ? 'Sin flujos' : null);
    
    if (flows.length > 0 && flows[0].steps) {
      test('Configuración', flows[0].steps.length > 0,
        `${flows[0].steps.length} pasos configurados`);
    }
  } else {
    test('Listar', false, result.error);
  }
}

async function checkWhatsApp() {
  section('WHATSAPP');
  const result = await request('GET', '/whatsapp/sessions');
  if (result.ok) {
    const sessions = result.data;
    const connected = sessions.filter(s => s.status === 'CONNECTED' || s.isConnected).length;
    test('Sesiones', true, `${sessions.length} sesiones (${connected} activas)`,
      connected === 0 ? 'Sin sesiones activas' : null);
  } else {
    test('Sesiones', false, result.error);
  }
}

async function checkAgentMonitoring() {
  section('MONITOREO DE AGENTES');
  const result = await request('GET', '/workday/active');
  if (result.ok) {
    const workdays = result.data;
    test('Jornadas activas', true, `${workdays.length} agentes`,
      workdays.length === 0 ? 'Sin agentes activos' : null);
    
    if (workdays.length > 0) {
      const w = workdays[0];
      
      // Validar cálculo de tiempos
      if (typeof w.totalWorkMinutes === 'number') {
        test('Tiempos', true, `${w.totalWorkMinutes} min trabajo`);
      } else {
        test('Tiempos', false, 'Falta totalWorkMinutes');
      }
      
      // Validar nombre de usuario
      if (w.user && w.user.fullName) {
        test('Nombre usuario', true, `Usuario: ${w.user.fullName}`);
      } else {
        test('Nombre usuario', false, 'Falta fullName',
          'Usuario sin nombre completo');
      }
    }
  } else {
    test('Jornadas activas', false, result.error);
  }
}

async function checkUsers() {
  section('USUARIOS Y ROLES');
  const result = await request('GET', '/users');
  if (result.ok) {
    const users = result.data;
    test('Listar usuarios', true, `${users.length} usuarios`);
    
    const noRole = users.filter(u => !u.role).length;
    test('Roles', noRole === 0, 
      noRole === 0 ? 'Todos con rol' : `${noRole} sin rol`);
  } else {
    test('Listar usuarios', false, result.error);
  }
  
  const rolesResult = await request('GET', '/roles');
  if (rolesResult.ok) {
    test('Roles', true, `${rolesResult.data.length} roles`);
  } else {
    test('Roles', false, rolesResult.error);
  }
}

async function checkReports() {
  section('REPORTES');
  const end = new Date().toISOString();
  const start = new Date(Date.now() - 30 * 86400000).toISOString();
  
  const mgmt = await request('GET', '/reports/management', { startDate: start, endDate: end });
  if (mgmt.ok) {
    test('Gestión', true, `Contactos: ${mgmt.data.totalContacts || 0}`);
  } else {
    test('Gestión', false, mgmt.error);
  }
  
  const fin = await request('GET', '/reports/financial', {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  if (fin.ok) {
    test('Financiero', true, `Recaudado: ${fin.data.totalCollected || 0}`);
  } else {
    test('Financiero', false, fin.error);
  }
}

async function checkBackup() {
  section('SISTEMA DE BACKUP');
  const result = await request('GET', '/backup/list');
  if (result.ok) {
    const backups = result.data;
    test('Backups', true, `${backups.length} backups`,
      backups.length === 0 ? 'Sin backups' : null);
    
    if (backups.length > 0) {
      const sorted = backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const days = Math.floor((Date.now() - new Date(sorted[0].createdAt)) / 86400000);
      test('Último backup', days <= 7, `Hace ${days} días`,
        days > 7 ? 'Backup antiguo' : null);
    }
  } else {
    test('Backups', false, result.error);
  }
}

function report() {
  section('REPORTE FINAL');
  const total = stats.passed + stats.failed;
  const rate = ((stats.passed / total) * 100).toFixed(1);
  
  console.log('');
  log('info', `Total: ${total} pruebas`);
  log('success', `Exitosas: ${stats.passed}`);
  log('error', `Fallidas: ${stats.failed}`);
  log('warning', `Advertencias: ${stats.warnings}`);
  console.log('');
  log('info', `Tasa de éxito: ${rate}%`);
  console.log('');
  
  if (stats.failed === 0) {
    log('success', '🎉 SISTEMA COMPLETAMENTE FUNCIONAL');
  } else if (rate >= 80) {
    log('warning', '⚠️  SISTEMA FUNCIONAL CON ÁREAS DE MEJORA');
  } else {
    log('error', '❌ PROBLEMAS CRÍTICOS DETECTADOS');
  }
  console.log('');
}

async function main() {
  console.clear();
  section('VALIDACIÓN DEL SISTEMA CRM - VPS PRODUCCIÓN');
  log('info', 'Ejecutando validación en localhost:3000');
  
  const auth = await authenticate();
  if (!auth) {
    log('error', 'No se pudo autenticar. Abortando.');
    process.exit(1);
  }
  
  await checkDashboard();
  await checkChats();
  await checkDebtors();
  await checkTemplates();
  await checkCampaigns();
  await checkBotFlows();
  await checkWhatsApp();
  await checkAgentMonitoring();
  await checkUsers();
  await checkReports();
  await checkBackup();
  
  report();
}

main().catch(err => {
  console.error(`${colors.red}Error fatal: ${err.message}${colors.reset}`);
  process.exit(1);
});
