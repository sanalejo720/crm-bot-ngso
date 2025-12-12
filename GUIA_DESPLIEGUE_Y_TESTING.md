# 🚀 GUÍA COMPLETA: DESPLIEGUE Y TESTING EN HOSTINGER

**CRM NGSO WhatsApp - Sistema de Cobranzas**  
**Fecha:** 1 de Diciembre, 2025

---

## 📋 ÍNDICE

1. [Preparación Inicial](#1-preparación-inicial)
2. [Despliegue en Hostinger](#2-despliegue-en-hostinger)
3. [Verificación Post-Despliegue](#3-verificación-post-despliegue)
4. [Testing de Endpoints](#4-testing-de-endpoints)
5. [Monitoreo y Logs](#5-monitoreo-y-logs)
6. [Solución de Problemas](#6-solución-de-problemas)

---

## 1. PREPARACIÓN INICIAL

### 1.1 Obtener IP del VPS Hostinger

```
1. Acceder a: https://hpanel.hostinger.com
2. Ir a: VPS → Tu VPS
3. Copiar la IP pública
4. Anotar IP: _________________
```

### 1.2 Configurar Clave SSH

```
1. En el panel de Hostinger:
   VPS → Configuración → Acceso SSH → Agregar clave SSH

2. Pegar tu clave pública:
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIeBbKS0mar6gPtOTXa2/v5j5sWn2tZvAF2XBbN3V0uA

3. Guardar
```

### 1.3 Verificar Conexión SSH

```powershell
# Desde Windows PowerShell
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP_AQUI

# Si funciona, escribir 'exit' para salir
exit
```

---

## 2. DESPLIEGUE EN HOSTINGER

### 2.1 Ejecutar Despliegue Automatizado

```powershell
# Abrir PowerShell como Administrador
cd d:\crm-ngso-whatsapp

# Ejecutar script de despliegue
.\deploy-from-windows.ps1
```

**El script hará:**
- ✅ Compilar backend (2-3 min)
- ✅ Compilar frontend (2-3 min)
- ✅ Crear archivo comprimido
- ✅ Subir al servidor (3-5 min)
- ✅ Descomprimir y configurar
- ✅ Reiniciar servicios

**Tiempo total: 10-15 minutos**

### 2.2 Configuración Inicial del Servidor (Primera Vez)

```bash
# Conectar al servidor
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP_AQUI

# Ejecutar instalación completa
bash /root/crm-ngso-whatsapp/deploy-hostinger.sh
```

**Este script instalará:**
- ✅ Node.js 20.x
- ✅ PostgreSQL 15
- ✅ Redis 7
- ✅ PM2
- ✅ Nginx
- ✅ Certbot (SSL)
- ✅ Configuración automática

**Tiempo total: 15-20 minutos**

### 2.3 Configurar SSL

```bash
# Aún conectado al servidor
bash /root/crm-ngso-whatsapp/setup-ssl-hostinger.sh
```

**El script hará:**
- ✅ Verificar DNS
- ✅ Obtener certificado Let's Encrypt
- ✅ Configurar HTTPS
- ✅ Configurar renovación automática

**Tiempo: 2-3 minutos**

---

## 3. VERIFICACIÓN POST-DESPLIEGUE

### 3.1 Ejecutar Script de Verificación Completa

```bash
# En el servidor (ya conectado por SSH)
bash /root/crm-ngso-whatsapp/verify-deployment.sh
```

**Este script verificará:**
- ✅ Servicios del sistema (Node.js, PM2, PostgreSQL, Redis, Nginx)
- ✅ Backend PM2 corriendo
- ✅ Base de datos accesible
- ✅ Redis respondiendo
- ✅ Nginx configurado correctamente
- ✅ Puertos abiertos (3000, 5432, 6379, 80, 443)
- ✅ Endpoints HTTP/HTTPS accesibles
- ✅ SSL/TLS funcionando
- ✅ Recursos del sistema (CPU, RAM, Disco)
- ✅ Archivos compilados presentes

**Resultado esperado:**
```
╔════════════════════════════════════════════════════════════════════╗
║     ✅ TODAS LAS VERIFICACIONES PASARON                            ║
║     Sistema funcionando correctamente                              ║
╚════════════════════════════════════════════════════════════════════╝
```

### 3.2 Verificar Visualmente en Navegador

**Abrir en tu navegador:**

1. **Frontend:**
   ```
   https://ngso-chat.assoftware.xyz
   ```
   - ✅ Debe cargar la página de login
   - ✅ Sin errores de SSL
   - ✅ Sin errores en consola (F12)

2. **Backend API:**
   ```
   https://ngso-chat.assoftware.xyz/api/v1/health
   ```
   - ✅ Debe mostrar: `{"status":"ok"}`

3. **Swagger Docs:**
   ```
   https://ngso-chat.assoftware.xyz/api/docs
   ```
   - ✅ Debe cargar documentación interactiva

---

## 4. TESTING DE ENDPOINTS

### 4.1 Preparar Testing desde Windows

```powershell
# Desde tu máquina local (Windows)
cd d:\crm-ngso-whatsapp

# Verificar que axios esté instalado
npm list axios

# Si no está instalado:
npm install axios
```

### 4.2 Ejecutar Tests de Endpoints

```powershell
# Ejecutar script de testing
node test-production-endpoints.js
```

**Este script probará:**

#### Módulo 1: Health & Status (2 endpoints)
- ✅ GET /health
- ✅ GET /

#### Módulo 2: Authentication (3 endpoints)
- ✅ POST /auth/login
- ✅ POST /auth/refresh
- ✅ GET /auth/profile

#### Módulo 3: Users (3 endpoints)
- ✅ GET /users
- ✅ GET /users/:id
- ✅ GET /users/:id/stats

#### Módulo 4: Roles & Permissions (2 endpoints)
- ✅ GET /roles
- ✅ GET /roles/permissions

#### Módulo 5: Campaigns (2 endpoints)
- ✅ GET /campaigns
- ✅ GET /campaigns/stats

#### Módulo 6: WhatsApp (2 endpoints)
- ✅ GET /whatsapp/numbers
- ✅ GET /whatsapp/status

#### Módulo 7: Chats (2 endpoints)
- ✅ GET /chats
- ✅ GET /chats/stats

#### Módulo 8: Messages (1 endpoint)
- ✅ GET /messages/stats

#### Módulo 9: Queue (2 endpoints)
- ✅ GET /queue/stats
- ✅ GET /queue/status

#### Módulo 10: Bot (1 endpoint)
- ✅ GET /bot/flows

#### Módulo 11: Clients/CRM (2 endpoints)
- ✅ GET /clients
- ✅ GET /clients/stats

#### Módulo 12: Debtors (2 endpoints)
- ✅ GET /debtors
- ✅ GET /debtors/stats

#### Módulo 13: Tasks (2 endpoints)
- ✅ GET /tasks
- ✅ GET /tasks/my-tasks

#### Módulo 14: Reports (3 endpoints)
- ✅ GET /reports/system
- ✅ GET /reports/agents
- ✅ GET /reports/campaigns

#### Módulo 15: Audit (1 endpoint)
- ✅ GET /audit

**Total: ~32 endpoints principales**

### 4.3 Resultado Esperado

```
╔════════════════════════════════════════════════════════════════════╗
║     TESTING COMPLETO - ENDPOINTS DE PRODUCCIÓN                    ║
║     CRM NGSO WhatsApp - Hostinger                                 ║
╚════════════════════════════════════════════════════════════════════╝

Base URL: https://ngso-chat.assoftware.xyz/api/v1

═══════════════════════════════════════════════════════════════════
  1. HEALTH & STATUS ENDPOINTS
═══════════════════════════════════════════════════════════════════
✅ Health Check - 200 (45ms)
✅ API Status - 200 (32ms)

[... más resultados ...]

═══════════════════════════════════════════════════════════════════
  RESUMEN DE RESULTADOS
═══════════════════════════════════════════════════════════════════

  Total de tests:      32
  ✅ Exitosos:         30
  ❌ Fallidos:         0
  ⏭️  Omitidos:         2

  Tiempo total:        3.45s

  🎉 Tasa de éxito:    93.75%

✅ ¡Sistema funcionando correctamente!
```

### 4.4 Testing Alternativo con cURL

Si prefieres probar manualmente:

```bash
# Health Check
curl https://ngso-chat.assoftware.xyz/api/v1/health

# Login
curl -X POST https://ngso-chat.assoftware.xyz/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"Admin123!"}'

# Guardar el token que devuelve y usarlo en siguiente request
TOKEN="tu_token_aqui"

# Obtener perfil
curl https://ngso-chat.assoftware.xyz/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. MONITOREO Y LOGS

### 5.1 Ver Logs del Backend

```bash
# Logs en tiempo real
pm2 logs crm-backend

# Últimas 100 líneas
pm2 logs crm-backend --lines 100

# Solo errores
pm2 logs crm-backend --err

# Logs sin seguimiento
pm2 logs crm-backend --nostream --lines 50
```

### 5.2 Ver Estado de Servicios

```bash
# Estado de PM2
pm2 status

# Monitoreo en tiempo real
pm2 monit

# Información detallada
pm2 show crm-backend
```

### 5.3 Ver Logs de Nginx

```bash
# Logs de acceso
sudo tail -f /var/log/nginx/crm-access.log

# Logs de errores
sudo tail -f /var/log/nginx/crm-error.log

# Últimas 50 líneas de errores
sudo tail -n 50 /var/log/nginx/crm-error.log
```

### 5.4 Ver Logs de PostgreSQL

```bash
# Logs principales
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Últimas 100 líneas
sudo tail -n 100 /var/log/postgresql/postgresql-15-main.log
```

### 5.5 Monitorear Recursos

```bash
# CPU, RAM, procesos en tiempo real
htop

# Uso de disco
df -h

# Uso de RAM
free -h

# Conexiones de red
sudo netstat -tulpn
```

---

## 6. SOLUCIÓN DE PROBLEMAS

### 6.1 Backend no responde

```bash
# Ver logs
pm2 logs crm-backend --lines 50

# Reiniciar backend
pm2 restart crm-backend

# Si no funciona, recompilar
cd /root/crm-ngso-whatsapp/backend
npm install
npm run build
pm2 restart crm-backend
```

### 6.2 Error 502 Bad Gateway

```bash
# Verificar que backend esté online
pm2 status

# Verificar Nginx
sudo nginx -t
sudo systemctl reload nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/crm-error.log
```

### 6.3 Base de datos no conecta

```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Probar conexión manual
PGPASSWORD="CRM_NgsoPass2024!" psql -U crm_admin -d crm_whatsapp -h localhost
```

### 6.4 Redis no funciona

```bash
# Verificar Redis
sudo systemctl status redis-server

# Reiniciar Redis
sudo systemctl restart redis-server

# Probar conexión
redis-cli ping
```

### 6.5 SSL no funciona

```bash
# Verificar DNS
nslookup ngso-chat.assoftware.xyz

# Ver certificados
sudo certbot certificates

# Renovar certificado
sudo certbot renew --force-renewal

# Recargar Nginx
sudo systemctl reload nginx
```

### 6.6 Frontend no carga

```bash
# Verificar archivos
ls -la /root/crm-ngso-whatsapp/frontend/dist/

# Verificar permisos
sudo chown -R www-data:www-data /root/crm-ngso-whatsapp/frontend/dist/

# Recompilar frontend
cd /root/crm-ngso-whatsapp/frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## 📊 CHECKLIST FINAL

### Despliegue

- [ ] IP del VPS obtenida
- [ ] Clave SSH agregada al panel
- [ ] SSH conecta correctamente
- [ ] Script `deploy-from-windows.ps1` ejecutado
- [ ] Script `deploy-hostinger.sh` ejecutado en servidor
- [ ] Script `setup-ssl-hostinger.sh` ejecutado

### Verificación

- [ ] Script `verify-deployment.sh` pasó todas las pruebas
- [ ] Frontend carga en navegador (HTTPS)
- [ ] Backend API responde (/health)
- [ ] Swagger docs accesible
- [ ] Sin errores de SSL

### Testing

- [ ] Script `test-production-endpoints.js` ejecutado
- [ ] Tasa de éxito >= 80%
- [ ] Login funciona correctamente
- [ ] Endpoints principales responden
- [ ] WebSocket conecta (verificar en dashboard)

### Post-Despliegue

- [ ] Logs del backend sin errores críticos
- [ ] Servicios corriendo (PostgreSQL, Redis, PM2, Nginx)
- [ ] Recursos del sistema normales (CPU, RAM, Disco)
- [ ] Backup automático configurado (opcional)
- [ ] Usuario admin creado

---

## 🎯 COMANDOS RÁPIDOS

```bash
# Conectar al servidor
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP

# Ver logs
pm2 logs crm-backend

# Reiniciar backend
pm2 restart crm-backend

# Verificar servicios
bash /root/crm-ngso-whatsapp/verify-deployment.sh

# Ver estado
pm2 status
```

---

## 📞 INFORMACIÓN DE CONTACTO

**URLs:**
- Frontend: https://ngso-chat.assoftware.xyz
- Backend: https://ngso-chat.assoftware.xyz/api/v1
- Swagger: https://ngso-chat.assoftware.xyz/api/docs

**SSH:**
- Usuario: root
- Clave: C:\Users\alejo\.ssh\key_vps
- IP: [Tu IP del VPS]

**Base de Datos:**
- Host: localhost
- Puerto: 5432
- Database: crm_whatsapp
- User: crm_admin
- Password: CRM_NgsoPass2024!

---

**¡Éxito en tu despliegue!** 🚀

---

**Desarrollado por:** AS Software - Alejandro Sandoval  
**Fecha:** 1 de Diciembre, 2025  
**Versión:** 1.0.0 - Production Ready
