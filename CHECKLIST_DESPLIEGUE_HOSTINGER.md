# ✅ CHECKLIST EJECUTIVA - DESPLIEGUE HOSTINGER
**CRM NGSO WhatsApp - Sistema de Cobranzas**

---

## 🎯 OBJETIVO
Desplegar el sistema CRM desde Azure a Hostinger VPS en menos de 1 hora.

---

## ⏱️ TIEMPO ESTIMADO TOTAL: 45-60 minutos

---

## 📋 FASE 1: PREPARACIÓN (10 minutos)

### 1.1 Hostinger Panel
- [ ] Acceder a https://hpanel.hostinger.com
- [ ] Ir a VPS → Copiar **IP pública** del VPS
- [ ] Anotar IP: `_____._____._____.______`

### 1.2 Configurar SSH
- [ ] Ir a VPS → Configuración → Acceso SSH
- [ ] Clic en "Agregar clave SSH"
- [ ] Pegar clave pública:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIeBbKS0mar6gPtOTXa2/v5j5sWn2tZvAF2XBbN3V0uA desarrollo.assoft@gmail.com
```
- [ ] Guardar

### 1.3 Verificar DNS
- [ ] Abrir PowerShell
- [ ] Ejecutar: `nslookup ngso-chat.assoftware.xyz`
- [ ] Verificar que apunta a la IP del VPS
- [ ] Si NO apunta: Configurar en panel de dominio (A record)

### 1.4 Probar Conexión SSH
```powershell
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP_AQUI
```
- [ ] Conexión exitosa ✅
- [ ] Si hay error: Verificar clave SSH agregada

---

## 🚀 FASE 2: DESPLIEGUE AUTOMATIZADO (15 minutos)

### 2.1 Compilar y Subir desde Windows

```powershell
# Abrir PowerShell como Administrador
cd d:\crm-ngso-whatsapp

# Ejecutar script
.\deploy-from-windows.ps1
```

**El script te preguntará:**
- [ ] Ingresar IP del VPS: `_____._____._____.______`
- [ ] Esperar compilación del backend (2-3 min)
- [ ] Esperar compilación del frontend (2-3 min)
- [ ] Esperar subida de archivos (3-5 min)

**Resultado esperado:**
```
✅ DESPLIEGUE COMPLETADO EXITOSAMENTE
```

---

## ⚙️ FASE 3: CONFIGURACIÓN INICIAL (20 minutos)

### 3.1 Conectar al Servidor

```powershell
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP_AQUI
```

### 3.2 Instalar Dependencias (Solo Primera Vez)

```bash
# Ejecutar script de instalación completa
bash /root/crm-ngso-whatsapp/deploy-hostinger.sh
```

**Este script instalará automáticamente:**
- [ ] Node.js 20.x (2 min)
- [ ] PostgreSQL 15 (3 min)
- [ ] Redis (1 min)
- [ ] PM2 (1 min)
- [ ] Nginx (1 min)
- [ ] Certbot (1 min)
- [ ] Configurar base de datos (2 min)
- [ ] Iniciar backend con PM2 (2 min)
- [ ] Configurar Nginx (2 min)

**Tiempo total:** ~15 minutos

**Credenciales generadas:**
```
Base de datos:
  Usuario: crm_admin
  Password: CRM_NgsoPass2024!
  Database: crm_whatsapp

JWT Secrets: (Generados automáticamente)
```

### 3.3 Verificar Servicios

```bash
# Ver estado del backend
pm2 status

# Ver logs
pm2 logs crm-backend --lines 20
```

**Esperado:**
- [ ] Estado: `online` ✅
- [ ] Sin errores críticos ✅

---

## 🔒 FASE 4: CONFIGURAR SSL (5 minutos)

### 4.1 Ejecutar Script SSL

```bash
bash /root/crm-ngso-whatsapp/setup-ssl-hostinger.sh
```

**El script hará:**
- [ ] Verificar DNS
- [ ] Obtener certificado Let's Encrypt
- [ ] Configurar HTTPS automáticamente
- [ ] Configurar renovación automática

**Resultado esperado:**
```
✅ SSL CONFIGURADO EXITOSAMENTE
```

---

## ✅ FASE 5: VERIFICACIÓN FINAL (10 minutos)

### 5.1 Probar URLs

**Frontend:**
- [ ] Abrir: https://ngso-chat.assoftware.xyz
- [ ] Debe cargar la página de login ✅
- [ ] Sin errores de SSL ✅

**Backend API:**
- [ ] Abrir: https://ngso-chat.assoftware.xyz/api/v1/health
- [ ] Debe mostrar: `{"status":"ok"}` ✅

**Swagger API Docs:**
- [ ] Abrir: https://ngso-chat.assoftware.xyz/api/docs
- [ ] Debe cargar documentación interactiva ✅

### 5.2 Probar Login

- [ ] Ir a: https://ngso-chat.assoftware.xyz
- [ ] Intentar login con: `admin@crm.com` / (password configurado)
- [ ] Si no existe usuario admin, crearlo en servidor:

```bash
# Conectar al servidor
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP

# Crear usuario admin (ejecutar uno de los scripts existentes)
cd /root/crm-ngso-whatsapp/backend
node dist/scripts/create-admin.js
```

### 5.3 Verificar WebSocket

- [ ] Login exitoso
- [ ] Panel de control carga correctamente
- [ ] Sin errores en consola del navegador (F12)
- [ ] WebSocket conectado (revisar Network → WS)

### 5.4 Verificar Logs

```bash
# En el servidor
pm2 logs crm-backend --lines 50
```

- [ ] Sin errores críticos ✅
- [ ] Conexión a PostgreSQL exitosa ✅
- [ ] Conexión a Redis exitosa ✅

---

## 📊 RESUMEN DE ESTADO

### Servicios en el Servidor

```bash
# Verificar todos los servicios
pm2 status                          # Backend
sudo systemctl status postgresql    # Base de datos
sudo systemctl status redis-server  # Redis
sudo systemctl status nginx         # Web server
```

**Todos deben estar:** `active (running)` ✅

### URLs de Acceso

```
✅ Frontend:  https://ngso-chat.assoftware.xyz
✅ Backend:   https://ngso-chat.assoftware.xyz/api/v1
✅ Swagger:   https://ngso-chat.assoftware.xyz/api/docs
✅ WebSocket: wss://ngso-chat.assoftware.xyz
```

---

## 🔧 CONFIGURACIÓN POST-DESPLIEGUE

### Opcional pero Recomendado

#### 1. Configurar WhatsApp
- [ ] Obtener credenciales Meta Cloud API
- [ ] Editar `.env.production` en servidor
- [ ] Reiniciar backend: `pm2 restart crm-backend`

#### 2. Crear Usuarios del Equipo
- [ ] Login como admin
- [ ] Ir a Usuarios → Crear nuevo
- [ ] Asignar roles apropiados

#### 3. Configurar Backup Automático
```bash
# Crear script de backup
nano ~/backup-db.sh
# (Copiar contenido de la guía)

chmod +x ~/backup-db.sh

# Agregar a cron
crontab -e
# Agregar: 0 2 * * * /root/backup-db.sh
```

#### 4. Configurar Monitoreo
```bash
# Instalar PM2 Plus (opcional)
pm2 plus

# O simplemente usar
pm2 monit
```

---

## 🆘 SOLUCIÓN RÁPIDA DE PROBLEMAS

### Error: Backend no inicia
```bash
cd /root/crm-ngso-whatsapp/backend
npm install
npm run build
pm2 restart crm-backend
pm2 logs crm-backend
```

### Error: 502 Bad Gateway
```bash
pm2 status                    # Verificar que backend esté online
sudo nginx -t                 # Verificar configuración Nginx
sudo systemctl reload nginx   # Recargar Nginx
```

### Error: Cannot connect to database
```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

### Error: SSL no funciona
```bash
# Verificar DNS primero
nslookup ngso-chat.assoftware.xyz

# Renovar certificado
sudo certbot renew --force-renewal
```

---

## 📞 INFORMACIÓN IMPORTANTE

### SSH Hostinger
```
IP: [Tu IP del VPS]
Usuario: root
Clave: C:\Users\alejo\.ssh\key_vps
```

### Base de Datos
```
Host: localhost
Puerto: 5432
Base de datos: crm_whatsapp
Usuario: crm_admin
Password: CRM_NgsoPass2024!
```

### Usuario Admin (Configurar)
```
Email: admin@crm.com
Password: (Configurar en primer uso)
```

---

## ✅ CHECKLIST FINAL

**Antes de dar por terminado, verificar:**

- [ ] ✅ SSH conecta correctamente
- [ ] ✅ Backend compilado sin errores
- [ ] ✅ Frontend compilado sin errores
- [ ] ✅ Servicios instalados (Node.js, PostgreSQL, Redis, PM2, Nginx)
- [ ] ✅ Base de datos creada y configurada
- [ ] ✅ SSL configurado (HTTPS funciona)
- [ ] ✅ Frontend carga en navegador
- [ ] ✅ Backend API responde
- [ ] ✅ Swagger docs accesible
- [ ] ✅ Login funciona
- [ ] ✅ WebSocket conecta
- [ ] ✅ Sin errores en logs

**Si todos los checkboxes están ✅: ¡DESPLIEGUE EXITOSO! 🎉**

---

## 🎯 PRÓXIMOS PASOS

1. **Configurar WhatsApp** (Meta Cloud API o WPPConnect)
2. **Crear usuarios del equipo**
3. **Realizar pruebas completas**
4. **Configurar backups automáticos**
5. **Monitorear logs primeros días**

---

## 📚 DOCUMENTACIÓN DE APOYO

Si necesitas más detalles en cualquier paso:

- **RESUMEN_DESPLIEGUE_HOSTINGER.md** - Resumen ejecutivo
- **GUIA_DESPLIEGUE_HOSTINGER.md** - Guía completa detallada
- **DEPLOY-QUICKSTART.md** - Guía rápida
- **INDICE_DOCUMENTACION.md** - Índice completo

---

## 💡 TIPS FINALES

1. **Guarda las credenciales** en un lugar seguro
2. **Haz backup** de la base de datos regularmente
3. **Monitorea logs** los primeros días
4. **Actualiza el sistema** periódicamente
5. **Rota los secrets** cada 3-6 meses

---

**¡Éxito en tu despliegue!** 🚀

---

**Última actualización:** Diciembre 2025  
**Tiempo estimado total:** 45-60 minutos  
**Dificultad:** ⭐⭐ (Media - Automatizado)
