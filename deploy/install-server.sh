#!/bin/bash
# Script de Instalación Inicial - Servidor Hostinger
# Ejecutar como: bash install.sh

set -e

echo "============================================"
echo "  CRM NGS&O - Instalación en Servidor Nuevo"
echo "============================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[1/8] Actualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/8] Instalando dependencias básicas...${NC}"
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx

echo -e "${YELLOW}[3/8] Instalando PostgreSQL 15...${NC}"
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

echo -e "${YELLOW}[4/8] Instalando Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${GREEN}✓ Node.js instalado: $(node -v)${NC}"
echo -e "${GREEN}✓ NPM instalado: $(npm -v)${NC}"

echo -e "${YELLOW}[5/8] Instalando PM2...${NC}"
npm install -g pm2
pm2 startup systemd -u root --hp /root

echo -e "${YELLOW}[6/8] Configurando PostgreSQL...${NC}"
sudo -u postgres psql << EOF
CREATE DATABASE crm_whatsapp;
CREATE USER crm_admin WITH PASSWORD 'CRM_NgsoPass2024!';
GRANT ALL PRIVILEGES ON DATABASE crm_whatsapp TO crm_admin;
ALTER DATABASE crm_whatsapp OWNER TO crm_admin;
\q
EOF

sudo -u postgres psql -d crm_whatsapp -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

echo -e "${YELLOW}[7/8] Creando estructura de directorios...${NC}"
mkdir -p /var/www/crm-ngso-whatsapp/{backend,frontend}
mkdir -p /var/backups
mkdir -p /var/www/crm-ngso-whatsapp/backend/{scripts,reports}

echo -e "${YELLOW}[8/8] Configurando firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✓ Instalación completada exitosamente${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Siguiente paso: Copiar archivos del servidor anterior"
