# 🚀 DESPLIEGUE AZURE - CRM NGSO WhatsApp

## 📋 Información del Servidor

### Azure Virtual Machine
- **Nombre:** vm-crm-ngso-prod
- **IP Pública:** 172.203.16.202
- **Región:** East US 2
- **Tamaño:** Standard_B2ms (2 vCPUs, 8GB RAM, 30GB SSD)
- **Sistema Operativo:** Ubuntu 22.04 LTS
- **Usuario SSH:** azureuser

### Acceso SSH
```bash
ssh azureuser@172.203.16.202
```

---

## 🌐 URLs de Acceso

### Producción
- **URL Temporal (IP):** http://172.203.16.202
- **URL Final (Dominio):** https://ngso-chat.assoftware.xyz *(pendiente SSL)*

### Credenciales Superadmin
- **Email:** admin@assoftware.xyz
- **Password:** NGSO.2025+*

---

## 🗄️ Base de Datos

### PostgreSQL 15
- **Host:** localhost
- **Puerto:** 5432
- **Base de datos:** crm_whatsapp
- **Usuario:** crm_admin
- **Password:** CRM_NgsoPass2024!

### Conectar a la BD desde el servidor
```bash
PGPASSWORD='CRM_NgsoPass2024!' psql -h localhost -U crm_admin -d crm_whatsapp
```

---

## 🔧 Servicios en Ejecución

### Backend (NestJS)
- **Puerto:** 3000
- **Proceso:** PM2 (proceso: crm-backend)
- **Ubicación:** /home/azureuser/crm-ngso-whatsapp/backend
- **Logs:** `pm2 logs crm-backend`
- **Estado:** `pm2 status`
- **Reiniciar:** `pm2 restart crm-backend`

### Frontend (Vite/React)
- **Ubicación:** /home/azureuser/crm-ngso-whatsapp/frontend/dist
- **Servido por:** Nginx

### Nginx
- **Puerto:** 80 (HTTP)
- **Configuración:** /etc/nginx/sites-available/crm-ngso
- **Reiniciar:** `sudo systemctl restart nginx`
- **Ver logs:** `sudo tail -f /var/log/nginx/error.log`

---

## 👥 Usuarios y Roles

### Roles Configurados
1. **Super Admin** (89 permisos) - Acceso total
2. **Administrador** (81 permisos) - Administración completa
3. **Supervisor** (73 permisos) - Supervisión y operaciones
4. **Agente** (18 permisos) - Atención de chats
5. **Calidad** (5 permisos) - Solo lectura para auditoría
6. **Auditoría** (19 permisos) - Lectura completa

### Usuario Actual
- Solo existe el usuario **Superadmin** (admin@assoftware.xyz)
- Crear más usuarios desde: **Panel → Usuarios → Crear Usuario**

---

## 🤖 Bot de WhatsApp

### Flujo Importado
- **Nombre:** Flujo Cobranza con Validación
- **ID:** ab8937f9-cc0c-4d5a-98c7-689600fbd54f
- **Estado:** Activo
- **Nodos:** 9 nodos configurados

### Funcionalidad del Bot
1. Saludo y solicitud de tratamiento de datos
2. Validación de aceptación
3. Captura de documento de identidad
4. Validación con base de deudores
5. Presentación de deuda personalizada
6. Menú de opciones (pagar, acordar, hablar con asesor)
7. Transferencia a agente según opción

**Para usar el bot:**
- Crear una campaña desde el panel
- Asociar el flujo del bot a la campaña
- Configurar número de WhatsApp
- Cargar base de deudores

---

## 📊 Estado de los Datos

### Tablas Pobladas
- ✅ **users:** 1 usuario (superadmin)
- ✅ **roles:** 6 roles
- ✅ **permissions:** 89 permisos
- ✅ **role_permissions:** Asignaciones completas
- ✅ **bot_flows:** 1 flujo activo
- ✅ **bot_nodes:** 9 nodos

### Tablas Vacías (Listas para uso)
- ⚪ campaigns
- ⚪ debtors
- ⚪ clients
- ⚪ chats
- ⚪ messages
- ⚪ tasks
- ⚪ whatsapp_numbers

---

## 🔒 Seguridad

### Network Security Group (NSG)
Puertos abiertos:
- **22** - SSH
- **80** - HTTP
- **443** - HTTPS (para SSL)
- **3000** - Backend (solo para testing, cerrar después)

### Firewall del Sistema
```bash
sudo ufw status
```

### SSL/TLS
**Estado:** ⏳ Pendiente
**Razón:** Esperando propagación DNS completa

**Comando para instalar SSL (ejecutar cuando DNS esté propagado):**
```bash
sudo certbot --nginx -d ngso-chat.assoftware.xyz --non-interactive --agree-tos --email admin@assoftware.xyz --redirect
```

**Verificar DNS propagado:**
```bash
nslookup ngso-chat.assoftware.xyz 8.8.8.8
# Debe resolver SOLO a: 172.203.16.202
```

---

## 🔄 Comandos Útiles

### PM2 (Backend)
```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs crm-backend --lines 100

# Reiniciar backend
pm2 restart crm-backend

# Parar backend
pm2 stop crm-backend

# Reiniciar después de cambios en código
cd /home/azureuser/crm-ngso-whatsapp/backend
npm run build
pm2 restart crm-backend
```

### Nginx
```bash
# Verificar configuración
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx

# Ver logs de error
sudo tail -f /var/log/nginx/error.log

# Ver logs de acceso
sudo tail -f /var/log/nginx/access.log
```

### Base de Datos
```bash
# Conectar
PGPASSWORD='CRM_NgsoPass2024!' psql -h localhost -U crm_admin -d crm_whatsapp

# Backup
pg_dump -h localhost -U crm_admin crm_whatsapp > backup_$(date +%Y%m%d).sql

# Restaurar
psql -h localhost -U crm_admin crm_whatsapp < backup.sql
```

---

## 📝 Tareas Pendientes

### Inmediatas
- [ ] Esperar propagación DNS completa (15-30 minutos)
- [ ] Instalar certificado SSL con Let's Encrypt
- [ ] Actualizar URLs del frontend para usar HTTPS
- [ ] Cerrar puerto 3000 en NSG (dejar solo 22, 80, 443)

### Configuración Inicial
- [ ] Crear usuarios adicionales (supervisores, agentes)
- [ ] Crear primera campaña
- [ ] Configurar número de WhatsApp
- [ ] Cargar base de deudores inicial
- [ ] Configurar plantillas de mensajes rápidas
- [ ] Probar flujo de bot end-to-end

### Optimización
- [ ] Configurar backup automático de base de datos
- [ ] Configurar monitoreo con PM2
- [ ] Implementar logs centralizados
- [ ] Configurar alertas de sistema
- [ ] Optimizar tamaño de bundles del frontend

---

## 🆘 Troubleshooting

### Backend no responde
```bash
# Ver logs
pm2 logs crm-backend --lines 50

# Reiniciar
pm2 restart crm-backend

# Si persiste, recompilar
cd /home/azureuser/crm-ngso-whatsapp/backend
npm run build
pm2 restart crm-backend
```

### Error 502 Bad Gateway
```bash
# Verificar que backend esté corriendo
pm2 status

# Verificar que escucha en puerto 3000
sudo netstat -tulpn | grep 3000

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### Base de datos no conecta
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Ver logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Frontend no carga
```bash
# Verificar permisos
ls -la /home/azureuser/crm-ngso-whatsapp/frontend/dist

# Verificar Nginx
sudo nginx -t
sudo systemctl status nginx

# Reconstruir frontend
cd /home/azureuser/crm-ngso-whatsapp/frontend
npm run build
sudo systemctl reload nginx
```

---

## 📞 Soporte

**Documentación del Proyecto:** Ver archivos en repositorio
- ARQUITECTURA.md
- API_ENDPOINTS.md
- TESTING_GUIDE.md
- COMANDOS_UTILES.md

**Logs del Sistema:**
- Backend: `pm2 logs crm-backend`
- Nginx: `/var/log/nginx/`
- PostgreSQL: `/var/log/postgresql/`
- Sistema: `journalctl -xe`

---

## ✅ Checklist de Verificación

Antes de dar por completado el despliegue:

- [x] VM creada y accesible por SSH
- [x] Servicios instalados (Node.js, PostgreSQL, PM2, Nginx)
- [x] Backend compilado y corriendo
- [x] Frontend compilado y servido
- [x] Base de datos inicializada
- [x] Usuarios y permisos creados
- [x] Flujo de bot importado
- [x] Registro DNS A creado
- [x] Aplicación accesible por IP
- [ ] DNS propagado completamente
- [ ] SSL configurado
- [ ] Aplicación accesible por HTTPS con dominio
- [ ] Primer usuario agente creado
- [ ] Primera campaña configurada

---

**Fecha de Despliegue:** 26 de Noviembre de 2025
**Versión:** 1.0.0 - Producción Inicial
**Estado:** ✅ OPERACIONAL (sin SSL)
