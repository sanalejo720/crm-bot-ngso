#!/usr/bin/env node
/**
 * Validación Completa del Sistema CRM en VPS
 * Ejecuta en el servidor: node validate-crm.js
 */

const axios = require('axios');

const API = 'http://localhost:3000/api/v1';
const USER = { email: 'admin@assoftware.xyz', password: 'password123' };

let token = null;
let passed = 0, failed = 0, warnings = 0;

const c = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', b: '\x1b[34m', c: '\x1b[36m', x: '\x1b[0m' };

const log = (t, m) => console.log(`${t === 'ok' ? c.g + '✓' : t === 'err' ? c.r + '✗' : t === 'warn' ? c.y + '⚠' : c.b + 'ℹ'} ${m}${c.x}`);
const sect = (t) => console.log(`\n${c.c}${'='.repeat(60)}\n${t}\n${'='.repeat(60)}${c.x}`);

function test(name, ok, msg, warn = null) {
  ok ? passed++ : failed++;
  log(ok ? 'ok' : 'err', `${name}: ${msg}`);
  if (warn) { warnings++; log('warn', `  └─ ${warn}`); }
}

async function req(method, path, data = null) {
  try {
    const cfg = { method, url: `${API}${path}`, headers: token ? { Authorization: `Bearer ${token}` } : {}, timeout: 10000 };
    if (data && method === 'GET') cfg.params = data;
    else if (data) cfg.data = data;
    const res = await axios(cfg);
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, err: e.response?.data?.message || e.message };
  }
}

async function auth() {
  sect('AUTENTICACIÓN');
  const r = await req('POST', '/auth/login', USER);
  if (r.ok && r.data.success !== false) {
    token = r.data.data.accessToken;
    test('Login', true, `${r.data.data.user.fullName} autenticado`);
    return true;
  }
  test('Login', false, r.err);
  return false;
}

async function main() {
  console.clear();
  sect('VALIDACIÓN SISTEMA CRM - VPS');
  log('info', 'Servidor: localhost:3000\n');
  
  if (!await auth()) return;
  
  // 1. Financial Dashboard
  sect('DASHBOARD FINANCIERO');
  let r = await req('GET', '/financial/summary');
  test('Resumen financiero', r.ok && r.data.success !== false, r.ok ? 'Datos OK' : r.err);
  
  // 2. Chats
  sect('TODOS LOS CHATS');
  r = await req('GET', '/chats');
  if (r.ok && r.data.success !== false) {
    const ch = r.data.data || r.data;
    const cnt = ch.total || (Array.isArray(ch) ? ch.length : 0);
    test('Listar chats', true, `${cnt} chats`, cnt === 0 ? 'Sin chats' : null);
    
    if (Array.isArray(ch) && ch.length > 0) {
      test('Estructura', !!ch[0].lastMessage, ch[0].lastMessage ? 'Campos completos' : 'Falta lastMessage');
    }
  } else test('Listar chats', false, r.err);
  
  // 3. Deudores
  sect('BASE DE DEUDORES');
  r = await req('GET', '/debtors');
  if (r.ok && r.data.success !== false) {
    const d = r.data.data || r.data;
    const cnt = d.total || (Array.isArray(d) ? d.length : 0);
    test('Listar deudores', true, `${cnt} deudores`, cnt === 0 ? 'Base vacía' : null);
    
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0];
      test('Datos críticos', !!(first.name && first.phone), 
        first.name && first.phone ? 'name, phone OK' : 'Faltan campos');
    }
  } else test('Listar deudores', false, r.err);
  
  // 4. Respuestas Rápidas/Plantillas
  sect('PLANTILLAS (RESPUESTAS RÁPIDAS)');
  r = await req('GET', '/quick-replies');
  if (r.ok && r.data.success !== false) {
    const t = r.data.data || r.data;
    const cnt = Array.isArray(t) ? t.length : 0;
    test('Listar plantillas', true, `${cnt} respuestas rápidas`, cnt === 0 ? 'Sin plantillas' : null);
  } else test('Listar plantillas', false, r.err);
  
  // 5. Evidencias de Pago
  sect('EVIDENCIAS DE PAGO');
  r = await req('GET', '/payment-evidences');
  if (r.ok && r.data.success !== false) {
    const ev = r.data.data || r.data;
    const cnt = ev.total || (Array.isArray(ev) ? ev.length : 0);
    test('Listar evidencias', true, `${cnt} evidencias`, cnt === 0 ? 'Sin evidencias' : null);
  } else test('Listar evidencias', false, r.err);
  
  // 6. PDFs de Cierre (Paz y Salvo)
  sect('PDFs DE CIERRE');
  r = await req('GET', '/paz-y-salvo');
  if (r.ok && r.data.success !== false) {
    const p = r.data.data || r.data;
    const cnt = Array.isArray(p) ? p.length : 0;
    test('Listar PDFs', true, `${cnt} documentos`, cnt === 0 ? 'Sin PDFs' : null);
  } else test('Listar PDFs', false, r.err);
  
  // 7. Promesas de Pago
  sect('PROMESAS DE PAGO');
  r = await req('GET', '/payment-promises');
  if (r.ok && r.data.success !== false) {
    const pr = r.data.data || r.data;
    const cnt = pr.total || (Array.isArray(pr) ? pr.length : 0);
    test('Listar promesas', true, `${cnt} promesas`, cnt === 0 ? 'Sin promesas' : null);
  } else test('Listar promesas', false, r.err);
  
  // 8. Clientes No Identificados
  sect('CLIENTES NO IDENTIFICADOS');
  r = await req('GET', '/unidentified-clients');
  if (r.ok && r.data.success !== false) {
    const uc = r.data.data || r.data;
    const cnt = uc.total || (Array.isArray(uc) ? uc.length : 0);
    test('Listar clientes', true, `${cnt} sin identificar`, cnt > 10 ? 'Muchos sin identificar' : null);
  } else test('Listar clientes', false, r.err);
  
  // 9. Reportes
  sect('REPORTES');
  r = await req('GET', '/reports');
  test('Sistema reportes', r.ok && r.data.success !== false, r.ok ? 'Disponible' : r.err);
  
  const end = new Date().toISOString();
  const start = new Date(Date.now() - 30 * 86400000).toISOString();
  r = await req('GET', '/reports/management', { startDate: start, endDate: end });
  test('Reporte gestión', r.ok && r.data.success !== false, 
    r.ok ? `Contactos: ${r.data.totalContacts || 0}` : r.err);
  
  // 10. Campañas
  sect('CAMPAÑAS');
  r = await req('GET', '/campaigns');
  if (r.ok && r.data.success !== false) {
    const cp = r.data.data || r.data;
    const cnt = Array.isArray(cp) ? cp.length : 0;
    test('Listar campañas', true, `${cnt} campañas`, cnt === 0 ? 'Sin campañas' : null);
  } else test('Listar campañas', false, r.err);
  
  // 11. Flujos de Bot
  sect('FLUJOS DE BOT');
  r = await req('GET', '/bot-flows');
  if (r.ok && r.data.success !== false) {
    const fl = r.data.data || r.data;
    const cnt = Array.isArray(fl) ? fl.length : 0;
    test('Listar flujos', true, `${cnt} flujos`, cnt === 0 ? 'Sin flujos' : null);
    
    if (Array.isArray(fl) && fl.length > 0 && fl[0].steps) {
      test('Configuración', fl[0].steps.length > 0, 
        `${fl[0].steps.length} pasos en primer flujo`, 
        fl[0].steps.length === 0 ? 'Flujo sin pasos' : null);
    }
  } else test('Listar flujos', false, r.err);
  
  // 12. Números de WhatsApp
  sect('NÚMEROS DE WHATSAPP');
  r = await req('GET', '/whatsapp-numbers');
  if (r.ok && r.data.success !== false) {
    const wn = r.data.data || r.data;
    const cnt = Array.isArray(wn) ? wn.length : 0;
    test('Números configurados', true, `${cnt} números`, cnt === 0 ? 'Sin números' : null);
  } else test('Números configurados', false, r.err);
  
  r = await req('GET', '/whatsapp/status');
  test('Estado servicio WPP', r.ok && r.data.success !== false, 
    r.ok ? `WhatsApp ${r.data.status || 'activo'}` : r.err);
  
  // 13. Monitoreo de Sesiones
  sect('MONITOREO DE AGENTES');
  r = await req('GET', '/workday/active');
  if (r.ok && r.data.success !== false) {
    const wd = r.data.data || r.data;
    const cnt = Array.isArray(wd) ? wd.length : 0;
    test('Jornadas activas', true, `${cnt} agentes conectados`, cnt === 0 ? 'Sin agentes activos' : null);
    
    if (Array.isArray(wd) && wd.length > 0) {
      const w = wd[0];
      
      // Validar cálculos de tiempo
      if (typeof w.totalWorkMinutes === 'number') {
        test('Cálculo tiempos', true, `${w.totalWorkMinutes}min trabajo, ${w.totalPauseMinutes || 0}min pausa`);
      } else {
        test('Cálculo tiempos', false, 'Falta totalWorkMinutes');
      }
      
      // Validar nombre de usuario
      if (w.user && w.user.fullName) {
        test('Nombre usuario', true, `Usuario: ${w.user.fullName}`);
      } else {
        test('Nombre usuario', false, 'Sin fullName', 'Usuario sin nombre completo');
      }
    }
  } else test('Jornadas activas', false, r.err);
  
  // 14. Usuarios
  sect('USUARIOS');
  r = await req('GET', '/users');
  if (r.ok && r.data.success !== false) {
    const us = r.data.data || r.data;
    const cnt = Array.isArray(us) ? us.length : 0;
    test('Listar usuarios', true, `${cnt} usuarios`, cnt === 0 ? 'Sin usuarios' : null);
    
    if (Array.isArray(us) && us.length > 0) {
      const noRole = us.filter(u => !u.role).length;
      test('Roles asignados', noRole === 0, 
        noRole === 0 ? 'Todos con rol' : `${noRole} sin rol asignado`);
    }
  } else test('Listar usuarios', false, r.err);
  
  // 15. Roles y Permisos
  sect('ROLES Y PERMISOS');
  r = await req('GET', '/roles');
  if (r.ok && r.data.success !== false) {
    const rl = r.data.data || r.data;
    const cnt = Array.isArray(rl) ? rl.length : 0;
    test('Listar roles', true, `${cnt} roles`, cnt < 3 ? 'Pocos roles configurados' : null);
    
    if (Array.isArray(rl) && rl.length > 0) {
      const noPerms = rl.filter(r => !r.permissions || r.permissions.length === 0).length;
      test('Permisos', noPerms === 0, 
        noPerms === 0 ? 'Todos los roles con permisos' : `${noPerms} roles sin permisos`);
    }
  } else test('Listar roles', false, r.err);
  
  // 16. Backup
  sect('SISTEMA DE BACKUP');
  r = await req('GET', '/backups');
  if (r.ok && r.data.success !== false) {
    const bk = r.data.data || r.data;
    const cnt = Array.isArray(bk) ? bk.length : 0;
    test('Backups disponibles', true, `${cnt} backups`, cnt === 0 ? 'Sin backups' : null);
    
    if (Array.isArray(bk) && bk.length > 0) {
      const sorted = bk.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const days = Math.floor((Date.now() - new Date(sorted[0].createdAt)) / 86400000);
      test('Último backup', days <= 7, `Hace ${days} días`, days > 7 ? 'Backup antiguo, considerar nuevo' : null);
    }
  } else test('Backups disponibles', false, r.err);
  
  // Reporte final
  sect('REPORTE FINAL');
  const total = passed + failed;
  const rate = ((passed / total) * 100).toFixed(1);
  
  console.log('');
  log('info', `Total: ${total} pruebas`);
  log('ok', `Exitosas: ${passed}`);
  log('err', `Fallidas: ${failed}`);
  log('warn', `Advertencias: ${warnings}`);
  console.log('');
  log('info', `Tasa de éxito: ${rate}%`);
  console.log('');
  
  if (failed === 0) log('ok', '🎉 SISTEMA COMPLETAMENTE FUNCIONAL');
  else if (rate >= 80) log('warn', '⚠️  SISTEMA FUNCIONAL CON ÁREAS DE MEJORA');
  else log('err', '❌ PROBLEMAS CRÍTICOS DETECTADOS');
  console.log('');
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
