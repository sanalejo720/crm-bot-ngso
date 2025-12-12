#!/bin/bash

# ====================================================================
# Script de Despliegue Automatizado para Hostinger
# CRM NGSO WhatsApp - Sistema de Cobranzas
# ====================================================================

set -e  # Salir si hay algún error

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración (MODIFICAR SEGÚN TU SERVIDOR)
DB_PASSWORD="CRM_NgsoPass2024!"
JWT_SECRET="crm-ngso-jwt-secret-super-seguro-2024-production-hostinger-xyz"
JWT_REFRESH_SECRET="crm-ngso-refresh-secret-super-seguro-2024-production-hostinger-xyz"
FRONTEND_DOMAIN="ngso-chat.assoftware.xyz"
EMAIL_PASSWORD="Adrian191017*"

echo ""
echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}   DESPLIEGUE AUTOMATIZADO CRM NGSO - HOSTINGER VPS${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Función para imprimir mensajes
print_step() {
    echo ""
    echo -e "${YELLOW}[$1] $2${NC}"
    echo "---------------------------------------------------------------------"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar si se ejecuta como root o con sudo
if [[ $EUID -ne 0 ]]; then
   print_error "Este script debe ejecutarse como root o con sudo"
   exit 1
fi

# ====================================================================
# PARTE 1: ACTUALIZAR SISTEMA
# ====================================================================

print_step "1/12" "Actualizando sistema operativo..."
apt update
apt upgrade -y
print_success "Sistema actualizado"

# ====================================================================
# PARTE 2: INSTALAR NODE.JS
# ====================================================================

print_step "2/12" "Instalando Node.js 20.x LTS..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_info "Node.js ya está instalado: $NODE_VERSION"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_success "Node.js instalado: $(node --version)"
fi

# ====================================================================
# PARTE 3: INSTALAR POSTGRESQL
# ====================================================================

print_step "3/12" "Instalando PostgreSQL 15..."
if command -v psql &> /dev/null; then
    print_info "PostgreSQL ya está instalado"
else
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt update
    apt install -y postgresql-15 postgresql-contrib-15
    systemctl enable postgresql
    systemctl start postgresql
    print_success "PostgreSQL instalado"
fi

# ====================================================================
# PARTE 4: CONFIGURAR BASE DE DATOS
# ====================================================================

print_step "4/12" "Configurando base de datos PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE crm_whatsapp;" 2>/dev/null || print_info "Base de datos ya existe"
sudo -u postgres psql -c "CREATE USER crm_admin WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_info "Usuario ya existe"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE crm_whatsapp TO crm_admin;"
sudo -u postgres psql -c "ALTER DATABASE crm_whatsapp OWNER TO crm_admin;"

# Configurar pg_hba.conf
PG_HBA="/etc/postgresql/15/main/pg_hba.conf"
if ! grep -q "crm_whatsapp" "$PG_HBA"; then
    echo "" >> "$PG_HBA"
    echo "# CRM NGSO Database Access" >> "$PG_HBA"
    echo "local   crm_whatsapp    crm_admin                               md5" >> "$PG_HBA"
    echo "host    crm_whatsapp    crm_admin       127.0.0.1/32            md5" >> "$PG_HBA"
    echo "host    crm_whatsapp    crm_admin       ::1/128                 md5" >> "$PG_HBA"
    systemctl restart postgresql
fi
print_success "Base de datos configurada"

# ====================================================================
# PARTE 5: INSTALAR REDIS
# ====================================================================

print_step "5/12" "Instalando Redis..."
if command -v redis-cli &> /dev/null; then
    print_info "Redis ya está instalado"
else
    apt install -y redis-server
    sed -i 's/supervised no/supervised systemd/g' /etc/redis/redis.conf
    systemctl restart redis-server
    systemctl enable redis-server
    print_success "Redis instalado"
fi

# ====================================================================
# PARTE 6: INSTALAR PM2
# ====================================================================

print_step "6/12" "Instalando PM2..."
if command -v pm2 &> /dev/null; then
    print_info "PM2 ya está instalado: $(pm2 --version)"
else
    npm install -g pm2
    print_success "PM2 instalado"
fi

# ====================================================================
# PARTE 7: INSTALAR NGINX
# ====================================================================

print_step "7/12" "Instalando Nginx..."
if command -v nginx &> /dev/null; then
    print_info "Nginx ya está instalado: $(nginx -v 2>&1)"
else
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    print_success "Nginx instalado"
fi

# ====================================================================
# PARTE 8: INSTALAR CERTBOT (SSL)
# ====================================================================

print_step "8/12" "Instalando Certbot para SSL..."
if command -v certbot &> /dev/null; then
    print_info "Certbot ya está instalado"
else
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot instalado"
fi

# ====================================================================
# PARTE 9: CONFIGURAR FIREWALL
# ====================================================================

print_step "9/12" "Configurando firewall UFW..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # API directa (opcional)
print_success "Firewall configurado"

# ====================================================================
# PARTE 10: CLONAR O ACTUALIZAR REPOSITORIO
# ====================================================================

print_step "10/12" "Clonando/actualizando repositorio..."
APP_DIR="/root/crm-ngso-whatsapp"
if [ -d "$APP_DIR" ]; then
    print_info "Directorio ya existe, actualizando..."
    cd "$APP_DIR"
    git pull origin feature/mejoras-crm-bot
else
    cd /root
    git clone https://github.com/sanalejo720/crm-bot-ngso.git crm-ngso-whatsapp
    cd crm-ngso-whatsapp
    git checkout feature/mejoras-crm-bot
fi
print_success "Repositorio actualizado"

# ====================================================================
# PARTE 11: CONFIGURAR Y COMPILAR BACKEND
# ====================================================================

print_step "11/12" "Configurando backend..."
cd "$APP_DIR/backend"

# Crear archivo .env.production
cat > .env.production << EOF
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://$FRONTEND_DOMAIN
TZ=America/Bogota

# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=crm_admin
DB_PASSWORD=$DB_PASSWORD
DB_NAME=crm_whatsapp
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Authentication
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d

# WhatsApp Meta Cloud API
META_WHATSAPP_TOKEN=your_meta_token
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_id
META_WEBHOOK_VERIFY_TOKEN=your_webhook_token
META_WHATSAPP_VERSION=v18.0

# WPPConnect
WPPCONNECT_SECRET_KEY=wppconnect-crm-ngso-2024-production
WPPCONNECT_PORT=21465

# Email Configuration - Hostinger SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@assoftware.xyz
SMTP_PASSWORD=$EMAIL_PASSWORD
SMTP_FROM=NGS&O CRM <admin@assoftware.xyz>
BACKUP_EMAIL_RECIPIENT=san.alejo0720@gmail.com

# Logging
LOG_LEVEL=info
EOF

print_info "Instalando dependencias del backend..."
npm install

print_info "Compilando backend..."
npm run build

# Crear carpeta de logs
mkdir -p /root/logs

# Crear ecosystem.config.js para PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'crm-backend',
    script: './dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    error_file: '/root/logs/crm-backend-error.log',
    out_file: '/root/logs/crm-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Iniciar backend con PM2
pm2 delete crm-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

# Configurar PM2 para iniciar al arrancar
pm2 startup systemd -u root --hp /root

print_success "Backend configurado y en ejecución"

# ====================================================================
# PARTE 12: CONFIGURAR Y COMPILAR FRONTEND
# ====================================================================

print_step "12/12" "Configurando frontend..."
cd "$APP_DIR/frontend"

# Crear archivo .env.production
cat > .env.production << EOF
# API Backend
VITE_API_URL=https://$FRONTEND_DOMAIN/api/v1

# WebSocket
VITE_SOCKET_URL=https://$FRONTEND_DOMAIN
EOF

print_info "Instalando dependencias del frontend..."
npm install

print_info "Compilando frontend..."
npm run build

print_success "Frontend compilado"

# ====================================================================
# PARTE 13: CONFIGURAR NGINX
# ====================================================================

print_step "13/13" "Configurando Nginx..."

# Crear configuración de Nginx
cat > /etc/nginx/sites-available/crm-ngso << 'NGINXEOF'
# Backend API - Proxy Reverso
upstream backend_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirigir HTTP a HTTPS (se activará después de SSL)
server {
    listen 80;
    listen [::]:80;
    server_name FRONTEND_DOMAIN_PLACEHOLDER;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        root /root/crm-ngso-whatsapp/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Logs
    access_log /var/log/nginx/crm-access.log;
    error_log /var/log/nginx/crm-error.log;
}
NGINXEOF

# Reemplazar placeholder con el dominio real
sed -i "s/FRONTEND_DOMAIN_PLACEHOLDER/$FRONTEND_DOMAIN/g" /etc/nginx/sites-available/crm-ngso

# Activar configuración
ln -sf /etc/nginx/sites-available/crm-ngso /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Recargar Nginx
systemctl reload nginx

print_success "Nginx configurado"

# ====================================================================
# FINALIZACIÓN
# ====================================================================

echo ""
echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}   ✅ DESPLIEGUE COMPLETADO EXITOSAMENTE${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo ""
echo -e "${YELLOW}📊 Estado de los servicios:${NC}"
pm2 status
echo ""
echo -e "${YELLOW}🌐 URLs de acceso:${NC}"
echo "   Frontend: http://$FRONTEND_DOMAIN"
echo "   Backend:  http://$FRONTEND_DOMAIN/api/v1"
echo ""
echo -e "${YELLOW}🔐 Credenciales de base de datos:${NC}"
echo "   Host:     localhost"
echo "   Database: crm_whatsapp"
echo "   User:     crm_admin"
echo "   Password: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo "   1. Configurar SSL con Certbot:"
echo "      sudo certbot --nginx -d $FRONTEND_DOMAIN"
echo ""
echo "   2. Ejecutar migraciones de base de datos:"
echo "      cd $APP_DIR/backend"
echo "      npm run typeorm:migration:run"
echo ""
echo "   3. Crear usuario administrador inicial"
echo ""
echo "   4. Configurar WhatsApp (Meta Cloud API o WPPConnect)"
echo ""
echo -e "${YELLOW}📚 Documentación completa:${NC}"
echo "   Ver: GUIA_DESPLIEGUE_HOSTINGER.md"
echo ""
echo -e "${YELLOW}🔧 Comandos útiles:${NC}"
echo "   Ver logs:        pm2 logs crm-backend"
echo "   Reiniciar:       pm2 restart crm-backend"
echo "   Estado:          pm2 status"
echo "   Monitoreo:       pm2 monit"
echo ""
echo -e "${GREEN}¡Despliegue completado! 🎉${NC}"
echo ""
