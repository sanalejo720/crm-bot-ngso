#!/bin/bash
# Script de Configuración Nginx + SSL
# Ejecutar EN el nuevo servidor (72.61.73.9)

set -e

echo "============================================"
echo "  Configuración Nginx + SSL"
echo "============================================"
echo ""

DOMAIN="ngso-chat.assoftware.xyz"
EMAIL="admin@assoftware.xyz"

echo "[1/5] Copiando configuración de Nginx..."
cat > /etc/nginx/sites-available/crm << 'EOF'
server {
    listen 80;
    server_name ngso-chat.assoftware.xyz;

    location / {
        root /var/www/crm-ngso-whatsapp/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

echo "[2/5] Activando sitio..."
ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "[3/5] Verificando configuración..."
nginx -t

echo "[4/5] Reiniciando Nginx..."
systemctl restart nginx

echo "[5/5] Generando certificado SSL..."
echo "IMPORTANTE: El DNS debe apuntar a esta IP antes de continuar"
echo "Presiona ENTER cuando el DNS esté actualizado..."
read

certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

echo ""
echo "============================================"
echo "  ✓ Nginx y SSL configurados"
echo "============================================"
echo ""
echo "Verificar en: https://$DOMAIN"
