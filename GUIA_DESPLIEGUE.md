# GUÍA DE DESPLIEGUE - CRM WhatsApp

## 📋 Requisitos del Servidor

### Especificaciones Mínimas (Hostinger VPS KVM 8)
- **CPU**: 4 vCPU
- **RAM**: 8 GB
- **Almacenamiento**: 200 GB SSD
- **Sistema Operativo**: Ubuntu 22.04 LTS o superior
- **Ancho de banda**: Ilimitado

### Software Requerido
- **Node.js**: v20.x o superior
- **PostgreSQL**: 15.x o superior
- **Redis**: 7.x o superior
- **Nginx**: 1.18 o superior
- **PM2**: Para gestión de procesos Node.js
- **Git**: Para deployment
- **Certbot**: Para certificados SSL (Let's Encrypt)

---

## 🔧 Configuración del Servidor

### 1. Actualizar el Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verificar: v20.x.x
npm --version   # Verificar: 10.x.x
```

### 3. Instalar PostgreSQL 15
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crear base de datos y usuario
sudo -u postgres psql
```

```sql
CREATE DATABASE crm_whatsapp;
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE crm_whatsapp TO crm_user;
\q
```

### 4. Instalar Redis
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Configurar Redis con password
sudo nano /etc/redis/redis.conf
# Descomentar y configurar: requirepass tu_password_redis
sudo systemctl restart redis-server
```

### 5. Instalar PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 startup systemd  # Ejecutar el comando que muestra
```

### 6. Instalar Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 📦 Deployment del Backend

### 1. Clonar Repositorio
```bash
cd /var/www
sudo git clone https://github.com/tu-usuario/crm-ngso-whatsapp.git
sudo chown -R $USER:$USER crm-ngso-whatsapp
cd crm-ngso-whatsapp/backend
```

### 2. Instalar Dependencias
```bash
npm install --production
```

### 3. Configurar Variables de Entorno
```bash
nano .env
```

Contenido del `.env`:
```env
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://tu-dominio.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=crm_user
DB_PASSWORD=tu_password_seguro
DB_NAME=crm_whatsapp
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu_password_redis

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_y_largo_minimo_32_caracteres
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=tu_refresh_secret_muy_seguro_y_largo
JWT_REFRESH_EXPIRES_IN=7d

# WhatsApp Meta Cloud API
META_WHATSAPP_TOKEN=tu_token_meta
META_WHATSAPP_PHONE_NUMBER_ID=tu_phone_id
META_WEBHOOK_VERIFY_TOKEN=tu_webhook_token
META_WHATSAPP_VERSION=v18.0

# WPPConnect
WPPCONNECT_SECRET_KEY=tu_wppconnect_secret
WPPCONNECT_PORT=21465

# Email (opcional - para notificaciones)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_password_email
SMTP_FROM=CRM WhatsApp <noreply@tu-dominio.com>

# Logging
LOG_LEVEL=info
```

### 4. Compilar el Proyecto
```bash
npm run build
```

### 5. Ejecutar Migraciones (si usas TypeORM migrations)
```bash
npm run typeorm:migration:run
```

### 6. Iniciar con PM2
```bash
pm2 start dist/main.js --name crm-backend --instances 2 --exec-mode cluster
pm2 save
pm2 startup
```

**Comandos PM2 útiles:**
```bash
pm2 status              # Ver estado
pm2 logs crm-backend    # Ver logs
pm2 restart crm-backend # Reiniciar
pm2 stop crm-backend    # Detener
pm2 delete crm-backend  # Eliminar proceso
pm2 monit              # Monitor en tiempo real
```

---

## 🌐 Configuración de Nginx

### 1. Crear Configuración del Sitio
```bash
sudo nano /etc/nginx/sites-available/crm-whatsapp
```

Contenido:
```nginx
# Upstream para el backend
upstream backend {
    least_conn;
    server localhost:3000;
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com api.tu-dominio.com;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Backend API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.tu-dominio.com;

    # SSL certificates (se configuran después con Certbot)
    ssl_certificate /etc/letsencrypt/live/api.tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tu-dominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Max upload size
    client_max_body_size 50M;

    # Proxy to backend
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
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

    # WebSocket para Socket.IO
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs
    access_log /var/log/nginx/crm-backend-access.log;
    error_log /var/log/nginx/crm-backend-error.log;
}

# Frontend (React app)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tu-dominio.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/crm-ngso-whatsapp/frontend/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logs
    access_log /var/log/nginx/crm-frontend-access.log;
    error_log /var/log/nginx/crm-frontend-error.log;
}
```

### 2. Habilitar el Sitio
```bash
sudo ln -s /etc/nginx/sites-available/crm-whatsapp /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar configuración
sudo systemctl reload nginx
```

---

## 🔒 Certificados SSL con Let's Encrypt

### 1. Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtener Certificados
```bash
sudo certbot --nginx -d tu-dominio.com -d api.tu-dominio.com
```

### 3. Renovación Automática
```bash
sudo certbot renew --dry-run  # Probar renovación
# Certbot configurará un cron job automático
```

---

## 🔥 Configuración del Firewall

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
sudo ufw status
```

---

## 📊 Monitoreo y Logs

### Ver Logs del Backend
```bash
pm2 logs crm-backend
pm2 logs crm-backend --lines 100  # Últimas 100 líneas
```

### Logs de Nginx
```bash
sudo tail -f /var/log/nginx/crm-backend-access.log
sudo tail -f /var/log/nginx/crm-backend-error.log
```

### Logs de PostgreSQL
```bash
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Monitoreo con PM2
```bash
pm2 monit  # Dashboard interactivo
pm2 web    # Dashboard web en http://localhost:9615
```

---

## 🔄 Actualización y Deployment

### Script de Deployment Automático
Crear archivo `deploy.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deployment..."

# Pull cambios
git pull origin main

# Backend
cd backend
echo "📦 Instalando dependencias..."
npm install --production

echo "🔨 Compilando..."
npm run build

echo "♻️ Reiniciando PM2..."
pm2 restart crm-backend

echo "✅ Deployment completado!"
```

Hacer ejecutable:
```bash
chmod +x deploy.sh
```

Ejecutar:
```bash
./deploy.sh
```

---

## 🔐 Seguridad Adicional

### 1. Fail2Ban para proteger SSH
```bash
sudo apt install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 2. Configurar PostgreSQL para conexiones locales
```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Asegurarse de que solo acepta conexiones locales
```

### 3. Configurar Redis para solo localhost
```bash
sudo nano /etc/redis/redis.conf
# bind 127.0.0.1 ::1
```

### 4. Backups Automáticos de PostgreSQL
```bash
sudo nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/postgresql"
mkdir -p $BACKUP_DIR

pg_dump -U crm_user crm_whatsapp | gzip > $BACKUP_DIR/crm_backup_$TIMESTAMP.sql.gz

# Mantener solo los últimos 7 días
find $BACKUP_DIR -name "crm_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completado: crm_backup_$TIMESTAMP.sql.gz"
```

```bash
sudo chmod +x /usr/local/bin/backup-db.sh
```

Agregar a crontab (backup diario a las 2 AM):
```bash
sudo crontab -e
```
```
0 2 * * * /usr/local/bin/backup-db.sh >> /var/log/db-backup.log 2>&1
```

---

## ✅ Checklist Post-Deployment

- [ ] Backend corriendo en PM2
- [ ] PostgreSQL configurado y accesible
- [ ] Redis configurado con password
- [ ] Nginx sirviendo correctamente
- [ ] Certificados SSL instalados
- [ ] Firewall configurado
- [ ] Variables de entorno configuradas
- [ ] Webhooks de WhatsApp configurados
- [ ] Backups automáticos configurados
- [ ] Monitoreo activo con PM2
- [ ] Logs funcionando correctamente
- [ ] Swagger documentation accesible (solo en dev)

---

## 🆘 Troubleshooting

### Backend no inicia
```bash
pm2 logs crm-backend --lines 50
# Verificar variables de entorno
# Verificar conexión a PostgreSQL y Redis
```

### Error de conexión a PostgreSQL
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

### Error de conexión a Redis
```bash
redis-cli ping
# Debería responder: PONG
```

### Nginx retorna 502 Bad Gateway
```bash
sudo nginx -t
sudo systemctl status nginx
pm2 status
# Verificar que el backend esté corriendo en puerto 3000
```

### Problemas con certificados SSL
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
```

---

## 📞 Contacto y Soporte

Para asistencia técnica o consultas sobre el deployment, contactar al equipo de desarrollo.

**Versión del documento**: 1.0  
**Última actualización**: Noviembre 2025
