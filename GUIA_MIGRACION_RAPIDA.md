# 🚀 GUÍA RÁPIDA DE MIGRACIÓN - HOSTINGER 72.61.73.9

## ⚡ PRERREQUISITOS

1. **Acceso SSH configurado** (root@72.61.73.9)
2. **DNS actualizado** a 72.61.73.9 (antes de SSL)
3. **Servidor actual** (Azure 172.203.16.202) funcionando

---

## 📋 PASOS DE MIGRACIÓN

### PASO 1: Instalación Inicial en Servidor Nuevo
```bash
# Conectar al nuevo servidor
ssh root@72.61.73.9

# Copiar script de instalación
# (Desde tu PC Windows)
scp d:\crm-ngso-whatsapp\deploy\install-server.sh root@72.61.73.9:/tmp/

# Ejecutar instalación
bash /tmp/install-server.sh
```

**Tiempo estimado: 10 minutos**

---

### PASO 2: Migrar Base de Datos
```bash
# DESDE el servidor Azure (172.203.16.202)
ssh azureuser@172.203.16.202

# Copiar y ejecutar script de migración
# (Primero copia el script desde tu PC)
bash migrate-database.sh
```

**Tiempo estimado: 20 minutos** (depende del tamaño de la BD)

---

### PASO 3: Crear Tabla de Operaciones Diarias
```bash
# EN el servidor nuevo (72.61.73.9)
psql -U crm_admin -d crm_whatsapp < /var/www/crm-ngso-whatsapp/backend/scripts/create-daily-operations.sql
```

---

### PASO 4: Desplegar Aplicación
```bash
# DESDE el servidor Azure
bash deploy-app.sh
```

**Tiempo estimado: 15 minutos**

---

### PASO 5: Configurar Nginx y SSL
```bash
# EN el servidor nuevo
bash /var/www/crm-ngso-whatsapp/deploy/configure-nginx.sh
```

**IMPORTANTE:** Antes de continuar, actualiza el DNS:
- Ir a panel de Hostinger
- Cambiar registro A de `ngso-chat.assoftware.xyz` a `72.61.73.9`
- Esperar 5-10 minutos para propagación

**Tiempo estimado: 10 minutos**

---

### PASO 6: Configurar Operaciones Diarias
```bash
# EN el servidor nuevo
bash /var/www/crm-ngso-whatsapp/deploy/setup-cron.sh
```

---

### PASO 7: Verificación Final
```bash
# 1. Verificar backend
pm2 status
pm2 logs crm-backend --lines 50

# 2. Verificar WhatsApp
curl http://localhost:3000/whatsapp/status

# 3. Verificar base de datos
psql -U crm_admin -d crm_whatsapp -c "
SELECT 
  (SELECT COUNT(*) FROM users) as usuarios,
  (SELECT COUNT(*) FROM debtors) as deudores,
  (SELECT COUNT(*) FROM chats) as chats;
"

# 4. Verificar Nginx
systemctl status nginx
curl -I https://ngso-chat.assoftware.xyz

# 5. Probar operaciones diarias manualmente
cd /var/www/crm-ngso-whatsapp/backend
node scripts/daily-opening.js
node scripts/daily-closing.js
```

---

## 🎯 VERIFICACIÓN DE FUNCIONALIDAD

### Frontend
- [ ] Acceder a https://ngso-chat.assoftware.xyz
- [ ] Login con usuario admin
- [ ] Ver lista de chats
- [ ] Abrir un chat y ver mensajes

### Backend
- [ ] API responde: `curl https://ngso-chat.assoftware.xyz/api/health`
- [ ] WebSocket conecta (ver consola del navegador)
- [ ] WhatsApp conectado

### Operaciones Diarias
- [ ] Script de apertura funciona (8:00 AM automático)
- [ ] Script de cierre funciona (6:00 PM automático)
- [ ] Backup automático (11:00 PM)
- [ ] Ver logs: `tail -f /var/log/crm-*.log`

---

## 📊 MONITOREO POST-MIGRACIÓN

### Comandos Útiles
```bash
# Ver logs del backend
pm2 logs crm-backend

# Ver logs de Nginx
tail -f /var/log/nginx/crm_error.log

# Ver estado de WhatsApp
curl http://localhost:3000/whatsapp/status | jq

# Ver operaciones diarias
psql -U crm_admin -d crm_whatsapp -c "SELECT * FROM v_daily_summary;"

# Ver cron jobs
crontab -l
```

---

## 🆘 TROUBLESHOOTING

### Backend no inicia
```bash
pm2 logs crm-backend --err
# Revisar .env, verificar credenciales de BD
```

### WhatsApp no conecta
```bash
# Verificar que las carpetas existen
ls -la /var/www/crm-ngso-whatsapp/backend/tokens
ls -la /var/www/crm-ngso-whatsapp/backend/wpp-sessions

# Regenerar QR si es necesario
curl http://localhost:3000/whatsapp/qr
```

### SSL no funciona
```bash
# Verificar DNS
nslookup ngso-chat.assoftware.xyz

# Forzar renovación
certbot renew --force-renewal
```

### Scripts diarios no ejecutan
```bash
# Ver logs de cron
grep CRON /var/log/syslog

# Ejecutar manualmente para probar
cd /var/www/crm-ngso-whatsapp/backend
node scripts/daily-opening.js
```

---

## ⏱️ TIEMPO TOTAL ESTIMADO

- **Instalación inicial:** 10 min
- **Migración BD:** 20 min
- **Despliegue app:** 15 min
- **Nginx + SSL:** 10 min
- **Configuración cron:** 5 min
- **Verificación:** 10 min

**TOTAL: ~70 minutos (1 hora 10 minutos)**

---

## 🔒 SEGURIDAD POST-MIGRACIÓN

```bash
# Cambiar contraseña de root
passwd

# Deshabilitar root SSH después de configurar usuario
# adduser tu_usuario
# usermod -aG sudo tu_usuario

# Configurar firewall
ufw status

# Revisar logs de acceso
tail -f /var/log/auth.log
```

---

## 📝 NOTAS FINALES

1. **Mantener Azure VM activa** durante 48h por si hay que revertir
2. **Monitorear logs** las primeras 24 horas
3. **Probar operaciones diarias** manualmente el primer día
4. **Verificar backups** en `/var/backups/crm`
5. **Documentar cualquier cambio** adicional necesario

---

## ✅ CHECKLIST FINAL

- [ ] Backend corriendo en PM2
- [ ] Base de datos migrada completamente
- [ ] WhatsApp conectado y respondiendo
- [ ] Frontend accesible vía HTTPS
- [ ] SSL válido y funcionando
- [ ] Cron jobs configurados
- [ ] Scripts diarios probados manualmente
- [ ] Backups automáticos configurados
- [ ] DNS apuntando al nuevo servidor
- [ ] Logs monitoreados
- [ ] Usuario admin puede acceder al sistema
- [ ] Agentes pueden ver y responder chats
- [ ] Bot responde correctamente

---

## 🎉 ¡SISTEMA LISTO PARA PRODUCCIÓN!

Una vez completados todos los pasos, el sistema estará:
- ✅ Funcionando al 100%
- ✅ Con operaciones diarias automatizadas
- ✅ Con backups automáticos
- ✅ Con SSL seguro
- ✅ Listo para el piloto con agentes reales
