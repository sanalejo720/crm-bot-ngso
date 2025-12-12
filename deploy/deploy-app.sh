#!/bin/bash
# Script de Despliegue de Aplicación
# Ejecutar DESDE el servidor Azure

set -e

NEW_SERVER="72.61.73.9"
BACKEND_DIR="/var/www/crm-ngso-whatsapp/backend"
FRONTEND_DIR="/var/www/crm-ngso-whatsapp/frontend"

echo "============================================"
echo "  Despliegue de Aplicación"
echo "============================================"
echo ""

echo "[1/6] Preparando backend para transferencia..."
cd ~/backend
npm run build
tar -czf backend.tar.gz dist node_modules package*.json tokens wpp-sessions scripts

echo "[2/6] Transfiriendo backend..."
scp backend.tar.gz root@$NEW_SERVER:/tmp/

echo "[3/6] Preparando frontend..."
cd ~/frontend
npm run build
tar -czf frontend.tar.gz dist

echo "[4/6] Transfiriendo frontend..."
scp frontend.tar.gz root@$NEW_SERVER:/tmp/

echo "[5/6] Creando archivo .env..."
cat > /tmp/.env << 'EOF'
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=crm_admin
DB_PASSWORD=CRM_NgsoPass2024!
DB_DATABASE=crm_whatsapp

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=7d

# WhatsApp
WHATSAPP_SESSION_NAME=default
WHATSAPP_AUTO_RESTORE=true

# CORS
CORS_ORIGIN=https://ngso-chat.assoftware.xyz
EOF

scp /tmp/.env root@$NEW_SERVER:$BACKEND_DIR/

echo "[6/6] Desplegando en nuevo servidor..."
ssh root@$NEW_SERVER << 'ENDSSH'
cd /var/www/crm-ngso-whatsapp/backend
tar -xzf /tmp/backend.tar.gz
chmod +x scripts/*.js

cd /var/www/crm-ngso-whatsapp/frontend
tar -xzf /tmp/frontend.tar.gz

# Iniciar backend con PM2
cd /var/www/crm-ngso-whatsapp/backend
pm2 start dist/main.js --name crm-backend
pm2 save

echo "✓ Aplicación desplegada"
ENDSSH

echo ""
echo "============================================"
echo "  ✓ Despliegue completado"
echo "============================================"
