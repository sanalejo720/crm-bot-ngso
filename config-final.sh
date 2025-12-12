#!/bin/bash
# Script de configuracion final - Ejecutar desde el servidor

set -e

echo "========================================="
echo "  CONFIGURACION FINAL CRM NGSO"
echo "========================================="

# 1. Descomprimir archivos de la aplicación
echo "Descomprimiendo aplicacion..."
cd /home/azureuser
unzip -o crm-app.zip -d crm-ngso-whatsapp/

# 2. Crear directorios necesarios
mkdir -p /home/azureuser/crm-ngso-whatsapp/backend/tokens
mkdir -p /home/azureuser/crm-ngso-whatsapp/backend/wpp-sessions
mkdir -p /home/azureuser/crm-ngso-whatsapp/backend/uploads

# 3. Configurar Backend
cd /home/azureuser/crm-ngso-whatsapp/backend

# Verificar que package.json existe
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json no encontrado en backend"
    exit 1
fi

# Crear .env.production
cat > .env.production << 'EOF'
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=crm_admin
DB_PASSWORD=CRM_NgsoPass2024!
DB_DATABASE=crm_whatsapp

# JWT
JWT_SECRET=crm-ngso-jwt-secret-super-seguro-2024-production-xyz
JWT_EXPIRATION=24h

# API
PORT=3000
NODE_ENV=production

# Email (Hostinger SMTP)
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=admin@assoftware.xyz
EMAIL_PASSWORD=tu_password_email_aqui

# CORS
CORS_ORIGIN=https://ngso-chat.assoftware.xyz

# WhatsApp
WHATSAPP_SESSION_PATH=/home/azureuser/crm-ngso-whatsapp/backend/wpp-sessions
WHATSAPP_TOKENS_PATH=/home/azureuser/crm-ngso-whatsapp/backend/tokens
EOF

echo "Instalando dependencias del backend..."
npm install

echo "Compilando backend..."
npm run build

echo "Ejecutando migraciones..."
NODE_ENV=production npm run migration:run || echo "ADVERTENCIA: Migraciones fallaron o no existen"

# 4. Configurar Frontend
cd /home/azureuser/crm-ngso-whatsapp/frontend

# Crear .env.production
cat > .env.production << 'EOF'
VITE_API_URL=https://ngso-chat.assoftware.xyz/api/v1
VITE_WS_URL=wss://ngso-chat.assoftware.xyz
EOF

echo "Instalando dependencias del frontend..."
npm install

echo "Compilando frontend..."
npm run build

# 5. Configurar Nginx
sudo tee /etc/nginx/sites-available/crm-ngso > /dev/null << 'EOF'
server {
    listen 80;
    server_name ngso-chat.assoftware.xyz;

    # Frontend
    location / {
        root /home/azureuser/crm-ngso-whatsapp/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_read_timeout 86400;
    }

    # Static files cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/azureuser/crm-ngso-whatsapp/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Activar configuracion
sudo ln -sf /etc/nginx/sites-available/crm-ngso /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar y recargar Nginx
sudo nginx -t
sudo systemctl reload nginx

# 6. Iniciar Backend con PM2
cd /home/azureuser/crm-ngso-whatsapp/backend

pm2 start dist/main.js --name crm-backend --env production
pm2 save
pm2 startup systemd

echo ""
echo "========================================="
echo "  CONFIGURACION COMPLETADA"
echo "========================================="
echo ""
echo "SIGUIENTE PASO: Configurar DNS"
echo ""
echo "En tu proveedor de dominio (Hostinger), crea:"
echo "  Tipo A: ngso-chat.assoftware.xyz -> 172.203.16.202"
echo ""
echo "Luego ejecuta para SSL:"
echo "  sudo certbot --nginx -d ngso-chat.assoftware.xyz"
echo ""
echo "Ver logs del backend:"
echo "  pm2 logs crm-backend"
echo ""
