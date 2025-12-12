# 🚀 Guía de Despliegue en Hostinger - CRM NGSO WhatsApp

**Migración desde Azure a Hostinger VPS**  
**Fecha:** Diciembre 2025  
**Proyecto:** NGS&O CRM Gestión de Cobranzas con WhatsApp

---

## 📋 Información del Servidor Hostinger

### Acceso SSH
```bash
Usuario: root (o usuario que configures)
Clave SSH: C:\Users\alejo\.ssh\key_vps
Clave Pública: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIeBbKS0mar6gPtOTXa2/v5j5sWn2tZvAF2XBbN3V0uA
```

### Especificaciones Recomendadas
- **Plan**: VPS KVM 4 o superior
- **RAM**: 8 GB (mínimo 4 GB)
- **CPU**: 4 vCPU (mínimo 2 vCPU)
- **Almacenamiento**: 200 GB SSD
- **SO**: Ubuntu 22.04 LTS

---

## 🔑 PARTE 1: Configurar Acceso SSH en Hostinger

### 1.1 Desde el Panel de Hostinger

1. **Acceder al Panel de Control**:
   - Ir a https://hpanel.hostinger.com
   - Seleccionar tu VPS

2. **Agregar Clave SSH Pública**:
   - Ir a **VPS** → **Configuración** → **Acceso SSH**
   - Clic en **Agregar clave SSH**
   - Pegar tu clave pública:
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIeBbKS0mar6gPtOTXa2/v5j5sWn2tZvAF2XBbN3V0uA desarrollo.assoft@gmail.com
   ```
   - Guardar

3. **Obtener IP del VPS**:
   - Copiar la **IP pública** que aparece en el panel
   - Ejemplo: `123.456.789.012`

### 1.2 Probar Conexión SSH

**Desde Windows PowerShell:**
```powershell
# Conectar al servidor
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP_HOSTINGER

# Si te pide contraseña, verificar que la clave esté agregada correctamente
```

**Solución de problemas:**
```powershell
# Si hay error de permisos en Windows:
icacls "C:\Users\alejo\.ssh\key_vps" /inheritance:r
icacls "C:\Users\alejo\.ssh\key_vps" /grant:r "%username%:R"
```

---

## 💻 PARTE 2: Configuración Inicial del Servidor

### 2.1 Actualizar Sistema

```bash
# Una vez conectado por SSH:
sudo apt update && sudo apt upgrade -y
```

### 2.2 Crear Usuario de Aplicación (Opcional pero Recomendado)

```bash
# Crear usuario para la aplicación
sudo adduser crm_user
sudo usermod -aG sudo crm_user

# Configurar SSH para el nuevo usuario
sudo mkdir -p /home/crm_user/.ssh
sudo cp ~/.ssh/authorized_keys /home/crm_user/.ssh/
sudo chown -R crm_user:crm_user /home/crm_user/.ssh
sudo chmod 700 /home/crm_user/.ssh
sudo chmod 600 /home/crm_user/.ssh/authorized_keys

# Cambiar a nuevo usuario
su - crm_user
```

### 2.3 Instalar Node.js 20.x

```bash
# Agregar repositorio de NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalación
node --version  # Debe mostrar v20.x.x
npm --version   # Debe mostrar 10.x.x

# Instalar pnpm (opcional, más rápido que npm)
sudo npm install -g pnpm
```

### 2.4 Instalar PostgreSQL 15

```bash
# Agregar repositorio de PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Instalar PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Verificar instalación
sudo systemctl status postgresql
```

### 2.5 Configurar PostgreSQL

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# Dentro de psql, ejecutar:
CREATE DATABASE crm_whatsapp;
CREATE USER crm_admin WITH ENCRYPTED PASSWORD 'TuPasswordSeguro2024!';
GRANT ALL PRIVILEGES ON DATABASE crm_whatsapp TO crm_admin;
ALTER DATABASE crm_whatsapp OWNER TO crm_admin;

-- Salir de psql
\q
```

**Configurar acceso local:**
```bash
# Editar pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Agregar estas líneas después de las líneas de comentarios:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   crm_whatsapp    crm_admin                               md5
host    crm_whatsapp    crm_admin       127.0.0.1/32            md5
host    crm_whatsapp    crm_admin       ::1/128                 md5
```

```bash
# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Probar conexión
psql -U crm_admin -d crm_whatsapp -h localhost
# Contraseña: TuPasswordSeguro2024!
```

### 2.6 Instalar Redis

```bash
# Instalar Redis
sudo apt install -y redis-server

# Configurar Redis
sudo nano /etc/redis/redis.conf
```

Modificar estas líneas:
```
supervised no  →  supervised systemd
bind 127.0.0.1 ::1
```

```bash
# Reiniciar Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Verificar instalación
redis-cli ping  # Debe responder: PONG
```

### 2.7 Instalar PM2 (Gestor de Procesos)

```bash
sudo npm install -g pm2

# Verificar instalación
pm2 --version
```

### 2.8 Instalar Nginx

```bash
sudo apt install -y nginx

# Verificar instalación
sudo systemctl status nginx
nginx -v
```

### 2.9 Configurar Firewall

```bash
# Habilitar firewall UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Para acceso directo a API (opcional)
sudo ufw enable

# Verificar estado
sudo ufw status
```

---

## 📦 PARTE 3: Desplegar la Aplicación

### 3.1 Clonar Repositorio

```bash
# Cambiar al directorio home
cd ~

# Clonar repositorio
git clone https://github.com/sanalejo720/crm-bot-ngso.git crm-ngso-whatsapp
cd crm-ngso-whatsapp

# Cambiar a rama de producción
git checkout feature/mejoras-crm-bot
```

**Alternativa - Subir archivos con SCP:**
```powershell
# Desde tu máquina local (Windows PowerShell)
scp -i "C:\Users\alejo\.ssh\key_vps" -r d:\crm-ngso-whatsapp root@TU_IP_HOSTINGER:/root/
```

### 3.2 Configurar Backend

```bash
cd ~/crm-ngso-whatsapp/backend

# Instalar dependencias
npm install

# Crear archivo .env.production
nano .env.production
```

**Contenido del `.env.production`:**
```env
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://ngso-chat.assoftware.xyz
TZ=America/Bogota

# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=crm_admin
DB_PASSWORD=TuPasswordSeguro2024!
DB_NAME=crm_whatsapp
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Authentication
JWT_SECRET=crm-ngso-jwt-secret-super-seguro-2024-production-hostinger-xyz
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=crm-ngso-refresh-secret-super-seguro-2024-production-hostinger-xyz
JWT_REFRESH_EXPIRES_IN=7d

# WhatsApp Meta Cloud API
META_WHATSAPP_TOKEN=tu_meta_whatsapp_token
META_WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
META_WEBHOOK_VERIFY_TOKEN=tu_webhook_verify_token
META_WHATSAPP_VERSION=v18.0

# WPPConnect
WPPCONNECT_SECRET_KEY=wppconnect-crm-ngso-2024-production
WPPCONNECT_PORT=21465

# Email Configuration - Hostinger SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@assoftware.xyz
SMTP_PASSWORD=Adrian191017*
SMTP_FROM=NGS&O CRM <admin@assoftware.xyz>
BACKUP_EMAIL_RECIPIENT=san.alejo0720@gmail.com

# Logging
LOG_LEVEL=info
```

**Compilar el backend:**
```bash
# Construir aplicación
npm run build

# Verificar que se creó la carpeta dist/
ls -la dist/
```

**Ejecutar migraciones y seeds:**
```bash
# Ejecutar migraciones (si las tienes configuradas)
npm run typeorm:migration:run

# O crear tablas manualmente con los scripts SQL
# Copiar contenido de los archivos .sql y ejecutar en psql
```

### 3.3 Crear Usuario Administrador

```bash
# Si tienes un script de creación de usuario admin
node dist/scripts/create-admin.js

# O crear manualmente desde psql
psql -U crm_admin -d crm_whatsapp -h localhost
```

```sql
-- Insertar usuario admin (ajustar según tu estructura de BD)
INSERT INTO users (email, password, name, role) 
VALUES ('admin@crm.com', '$2b$10$...', 'Admin', 'super_admin');
```

### 3.4 Iniciar Backend con PM2

```bash
cd ~/crm-ngso-whatsapp/backend

# Crear archivo de configuración de PM2
nano ecosystem.config.js
```

**Contenido del `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [{
    name: 'crm-backend',
    script: './dist/main.js',
    instances: 2,  // O 'max' para usar todos los CPU
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    error_file: '/home/crm_user/logs/crm-backend-error.log',
    out_file: '/home/crm_user/logs/crm-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

**Iniciar aplicación:**
```bash
# Crear carpeta de logs
mkdir -p ~/logs

# Iniciar con PM2
pm2 start ecosystem.config.js --env production

# Verificar estado
pm2 status
pm2 logs crm-backend

# Guardar configuración de PM2
pm2 save

# Configurar PM2 para iniciar al arrancar el sistema
pm2 startup systemd
# Ejecutar el comando que PM2 te muestra (sudo env PATH=...)
```

### 3.5 Configurar Frontend

```bash
cd ~/crm-ngso-whatsapp/frontend

# Crear archivo .env.production
nano .env.production
```

**Contenido del `.env.production`:**
```env
# API Backend
VITE_API_URL=https://ngso-chat.assoftware.xyz/api/v1

# WebSocket
VITE_SOCKET_URL=https://ngso-chat.assoftware.xyz
```

**Compilar frontend:**
```bash
# Instalar dependencias
npm install

# Construir para producción
npm run build

# Verificar que se creó la carpeta dist/
ls -la dist/
```

---

## 🌐 PARTE 4: Configurar Nginx

### 4.1 Crear Configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/crm-ngso
```

**Contenido del archivo:**
```nginx
# Backend API - Proxy Reverso
upstream backend_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ngso-chat.assoftware.xyz;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Frontend y Backend
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ngso-chat.assoftware.xyz;

    # SSL Certificates (se configurarán con Certbot)
    ssl_certificate /etc/letsencrypt/live/ngso-chat.assoftware.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ngso-chat.assoftware.xyz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Frontend - React SPA
    location / {
        root /root/crm-ngso-whatsapp/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache para archivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket Support
    location /socket.io {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Logs
    access_log /var/log/nginx/crm-access.log;
    error_log /var/log/nginx/crm-error.log;
}
```

### 4.2 Activar Configuración

```bash
# Crear symlink
sudo ln -s /etc/nginx/sites-available/crm-ngso /etc/nginx/sites-enabled/

# Eliminar configuración por defecto
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

## 🔒 PARTE 5: Configurar SSL con Let's Encrypt

### 5.1 Verificar DNS

Antes de configurar SSL, asegúrate de que tu dominio esté apuntando a la IP del VPS:

```bash
# Verificar DNS
nslookup ngso-chat.assoftware.xyz
# Debe mostrar la IP de tu VPS Hostinger
```

### 5.2 Instalar Certbot

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 5.3 Obtener Certificado SSL

```bash
# Obtener certificado para tu dominio
sudo certbot --nginx -d ngso-chat.assoftware.xyz

# Responder las preguntas:
# - Email: tu_email@ejemplo.com
# - Aceptar términos: Yes
# - Compartir email: No
# - Redirect HTTP to HTTPS: Yes (recomendado)
```

### 5.4 Verificar Renovación Automática

```bash
# Certbot configura renovación automática
# Probar renovación en seco
sudo certbot renew --dry-run

# Ver timer de renovación
sudo systemctl status certbot.timer
```

---

## 🔧 PARTE 6: Scripts de Administración

### 6.1 Script de Actualización

Crear script para actualizar la aplicación fácilmente:

```bash
nano ~/update-crm.sh
```

**Contenido:**
```bash
#!/bin/bash

echo "🔄 Actualizando CRM NGSO..."

# Backend
echo "📦 Actualizando backend..."
cd ~/crm-ngso-whatsapp/backend
git pull origin feature/mejoras-crm-bot
npm install
npm run build

echo "🔄 Reiniciando backend..."
pm2 restart crm-backend

# Frontend
echo "🎨 Actualizando frontend..."
cd ~/crm-ngso-whatsapp/frontend
npm install
npm run build

echo "🌐 Recargando Nginx..."
sudo systemctl reload nginx

echo "✅ Actualización completada!"
echo ""
echo "📊 Estado de la aplicación:"
pm2 status
```

```bash
# Dar permisos de ejecución
chmod +x ~/update-crm.sh

# Usar:
~/update-crm.sh
```

### 6.2 Script de Backup de Base de Datos

```bash
nano ~/backup-db.sh
```

**Contenido:**
```bash
#!/bin/bash

BACKUP_DIR="/root/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="crm_whatsapp_backup_$DATE.sql"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

echo "🗄️ Creando backup de base de datos..."
PGPASSWORD="TuPasswordSeguro2024!" pg_dump -U crm_admin -h localhost crm_whatsapp > "$BACKUP_DIR/$BACKUP_FILE"

# Comprimir backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Backup creado: $BACKUP_FILE.gz"

# Eliminar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "🧹 Backups antiguos eliminados"
```

```bash
# Dar permisos
chmod +x ~/backup-db.sh

# Configurar cron para backup diario a las 2 AM
crontab -e
```

Agregar línea:
```cron
0 2 * * * /root/backup-db.sh >> /root/logs/backup.log 2>&1
```

### 6.3 Script de Monitoreo

```bash
nano ~/monitor-crm.sh
```

**Contenido:**
```bash
#!/bin/bash

echo "📊 Estado del CRM NGSO"
echo "====================="
echo ""

echo "🔹 Backend (PM2):"
pm2 status

echo ""
echo "🔹 Nginx:"
sudo systemctl status nginx --no-pager | grep Active

echo ""
echo "🔹 PostgreSQL:"
sudo systemctl status postgresql --no-pager | grep Active

echo ""
echo "🔹 Redis:"
sudo systemctl status redis-server --no-pager | grep Active

echo ""
echo "🔹 Uso de CPU y RAM:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1"%"}'
free -h | awk 'NR==2{printf "RAM Usage: %s/%s (%.2f%%)\n", $3,$2,$3*100/$2 }'

echo ""
echo "🔹 Espacio en disco:"
df -h / | awk 'NR==2{printf "Disk Usage: %s/%s (%s)\n", $3,$2,$5}'

echo ""
echo "🔹 Últimos logs del backend:"
pm2 logs crm-backend --lines 10 --nostream
```

```bash
chmod +x ~/monitor-crm.sh
```

---

## 📊 PARTE 7: Comandos Útiles

### Backend (PM2)

```bash
# Ver logs en tiempo real
pm2 logs crm-backend

# Ver logs de las últimas 100 líneas
pm2 logs crm-backend --lines 100

# Reiniciar aplicación
pm2 restart crm-backend

# Detener aplicación
pm2 stop crm-backend

# Ver estado y recursos
pm2 status
pm2 monit

# Ver información detallada
pm2 show crm-backend

# Eliminar del listado de PM2
pm2 delete crm-backend
```

### Base de Datos

```bash
# Conectar a PostgreSQL
psql -U crm_admin -d crm_whatsapp -h localhost

# Backup manual
PGPASSWORD="TuPasswordSeguro2024!" pg_dump -U crm_admin -h localhost crm_whatsapp > backup.sql

# Restaurar backup
PGPASSWORD="TuPasswordSeguro2024!" psql -U crm_admin -h localhost crm_whatsapp < backup.sql

# Ver tamaño de la base de datos
psql -U crm_admin -d crm_whatsapp -h localhost -c "SELECT pg_size_pretty(pg_database_size('crm_whatsapp'));"
```

### Nginx

```bash
# Verificar configuración
sudo nginx -t

# Recargar configuración (sin downtime)
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/crm-access.log
sudo tail -f /var/log/nginx/crm-error.log

# Ver estado
sudo systemctl status nginx
```

### Sistema

```bash
# Ver uso de recursos
htop

# Espacio en disco
df -h

# Memoria RAM
free -h

# Procesos que más consumen CPU
top

# Ver puertos abiertos
sudo netstat -tulpn | grep LISTEN
```

---

## 🚨 PARTE 8: Troubleshooting

### Backend no inicia

```bash
# Ver logs completos
pm2 logs crm-backend --lines 200

# Verificar que el archivo main.js existe
ls -la ~/crm-ngso-whatsapp/backend/dist/main.js

# Verificar variables de entorno
cat ~/crm-ngso-whatsapp/backend/.env.production

# Probar inicio manual
cd ~/crm-ngso-whatsapp/backend
NODE_ENV=production node dist/main.js
```

### Error de conexión a PostgreSQL

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar conexión
psql -U crm_admin -d crm_whatsapp -h localhost

# Ver logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### Error 502 Bad Gateway

```bash
# Verificar que el backend esté corriendo
pm2 status

# Ver logs de Nginx
sudo tail -f /var/log/nginx/crm-error.log

# Verificar configuración de Nginx
sudo nginx -t

# Reiniciar servicios
pm2 restart crm-backend
sudo systemctl reload nginx
```

### Frontend muestra pantalla blanca

```bash
# Verificar archivos del frontend
ls -la ~/crm-ngso-whatsapp/frontend/dist/

# Verificar permisos
sudo chown -R www-data:www-data ~/crm-ngso-whatsapp/frontend/dist/
sudo chmod -R 755 ~/crm-ngso-whatsapp/frontend/dist/

# Reconstruir frontend
cd ~/crm-ngso-whatsapp/frontend
npm run build
```

### SSL no funciona

```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificados manualmente
sudo certbot renew

# Ver logs de Certbot
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Redis no conecta

```bash
# Verificar Redis
sudo systemctl status redis-server

# Probar conexión
redis-cli ping

# Reiniciar Redis
sudo systemctl restart redis-server

# Ver logs
sudo tail -f /var/log/redis/redis-server.log
```

---

## ✅ PARTE 9: Checklist de Despliegue

### Preparación

- [ ] Cuenta de Hostinger VPS activa
- [ ] Dominio configurado apuntando a IP del VPS
- [ ] Clave SSH agregada al panel de Hostinger
- [ ] Conexión SSH probada exitosamente

### Instalación

- [ ] Sistema actualizado (`apt update && upgrade`)
- [ ] Node.js 20.x instalado
- [ ] PostgreSQL 15 instalado y configurado
- [ ] Redis instalado y corriendo
- [ ] PM2 instalado globalmente
- [ ] Nginx instalado
- [ ] Firewall UFW configurado

### Aplicación

- [ ] Repositorio clonado o archivos subidos
- [ ] Backend: dependencias instaladas (`npm install`)
- [ ] Backend: `.env.production` configurado
- [ ] Backend: aplicación compilada (`npm run build`)
- [ ] Backend: migraciones ejecutadas
- [ ] Backend: usuario admin creado
- [ ] Backend: iniciado con PM2
- [ ] Frontend: dependencias instaladas
- [ ] Frontend: `.env.production` configurado
- [ ] Frontend: aplicación compilada (`npm run build`)

### Nginx y SSL

- [ ] Nginx: configuración creada y activada
- [ ] Nginx: prueba exitosa (`nginx -t`)
- [ ] SSL: certificado Let's Encrypt obtenido
- [ ] SSL: renovación automática configurada
- [ ] HTTPS: redirección de HTTP a HTTPS activa

### Scripts y Automatización

- [ ] Script de actualización creado (`update-crm.sh`)
- [ ] Script de backup creado (`backup-db.sh`)
- [ ] Cron job de backups configurado
- [ ] Script de monitoreo creado (`monitor-crm.sh`)

### Seguridad

- [ ] Firewall UFW habilitado
- [ ] Fail2Ban instalado (opcional)
- [ ] Permisos de archivos configurados correctamente
- [ ] Contraseñas seguras en `.env`
- [ ] JWT secrets únicos generados

### Verificación Final

- [ ] Frontend accesible en `https://ngso-chat.assoftware.xyz`
- [ ] Backend API responde en `https://ngso-chat.assoftware.xyz/api/v1`
- [ ] WebSocket conecta correctamente
- [ ] Login funciona correctamente
- [ ] Base de datos accesible
- [ ] Redis funciona correctamente
- [ ] Logs de PM2 sin errores críticos
- [ ] Logs de Nginx sin errores 502/503

---

## 🎉 PARTE 10: Post-Despliegue

### 10.1 Verificar la Aplicación

```bash
# Probar endpoint de salud
curl https://ngso-chat.assoftware.xyz/api/v1/health

# Probar login
curl -X POST https://ngso-chat.assoftware.xyz/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"tu_password"}'
```

### 10.2 Configurar Monitoreo

```bash
# Ver métricas en tiempo real
pm2 monit

# Instalar PM2 Plus (opcional - monitoreo avanzado)
pm2 plus
```

### 10.3 Documentar Credenciales

Guardar en un lugar seguro:

```
=== HOSTINGER VPS CRM NGSO ===

IP VPS: [TU_IP]
SSH User: root
SSH Key: C:\Users\alejo\.ssh\key_vps

URL Frontend: https://ngso-chat.assoftware.xyz
URL Backend: https://ngso-chat.assoftware.xyz/api/v1

PostgreSQL:
  Host: localhost
  Port: 5432
  Database: crm_whatsapp
  User: crm_admin
  Password: [GUARDAR_SEGURO]

Usuario Admin:
  Email: admin@crm.com
  Password: [GUARDAR_SEGURO]

JWT Secret: [GUARDAR_SEGURO]
```

---

## 💰 Estimación de Costos Hostinger

**VPS KVM 4:**
- 8 GB RAM
- 4 vCPU
- 200 GB SSD
- ~$15-25 USD/mes (mucho más económico que Azure)

**VPS KVM 2 (alternativa económica):**
- 4 GB RAM
- 2 vCPU
- 100 GB SSD
- ~$8-12 USD/mes

---

## 📞 Soporte

### Logs Importantes

```bash
# Backend
pm2 logs crm-backend

# Nginx
sudo tail -f /var/log/nginx/crm-error.log

# PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Sistema
sudo journalctl -xe
```

### Recursos Útiles

- **Panel Hostinger**: https://hpanel.hostinger.com
- **Documentación Hostinger VPS**: https://support.hostinger.com/es/collections/1743609-vps
- **NestJS Docs**: https://docs.nestjs.com
- **PM2 Docs**: https://pm2.keymetrics.io

---

## 🎯 Próximos Pasos

1. ✅ **Desplegar aplicación en Hostinger**
2. 🔄 **Migrar datos desde Azure** (si es necesario)
3. 🧪 **Pruebas completas en producción**
4. 📱 **Configurar WhatsApp (Meta Cloud API o WPPConnect)**
5. 👥 **Crear usuarios para el equipo**
6. 📊 **Configurar monitoreo y alertas**
7. 🔐 **Configurar backups automáticos**

---

**¡Despliegue en Hostinger completado!** 🚀

Tu aplicación estará disponible en:
- **Frontend**: https://ngso-chat.assoftware.xyz
- **Backend API**: https://ngso-chat.assoftware.xyz/api/v1
- **Documentación API**: https://ngso-chat.assoftware.xyz/api/docs

---

**Última actualización:** Diciembre 2025  
**Desarrollado por:** AS Software - Alejandro Sandoval
