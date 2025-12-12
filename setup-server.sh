#!/bin/bash

# Script de configuracion automatica para CRM NGSO WhatsApp en Azure
# Ejecutar con: bash setup-server.sh

set -e  # Salir si hay algun error

echo "========================================="
echo "  CONFIGURACION SERVIDOR CRM NGSO"
echo "========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables de configuracion
DB_PASSWORD="CRM_NgsoPass2024!"
JWT_SECRET="crm-ngso-jwt-secret-super-seguro-2024-production"
EMAIL_PASSWORD=""  # Debes configurar esto

echo -e "${YELLOW}[1/10] Actualizando sistema...${NC}"
sudo apt update
sudo apt upgrade -y

echo ""
echo -e "${YELLOW}[2/10] Instalando Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

echo ""
echo -e "${YELLOW}[3/10] Instalando PostgreSQL 15...${NC}"
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

echo ""
echo -e "${YELLOW}[4/10] Configurando PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE DATABASE crm_whatsapp;" || echo "Base de datos ya existe"
sudo -u postgres psql -c "CREATE USER crm_admin WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" || echo "Usuario ya existe"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE crm_whatsapp TO crm_admin;"

# Configurar pg_hba.conf
echo "local   crm_whatsapp    crm_admin                               md5" | sudo tee -a /etc/postgresql/15/main/pg_hba.conf
echo "host    crm_whatsapp    crm_admin       127.0.0.1/32            md5" | sudo tee -a /etc/postgresql/15/main/pg_hba.conf
sudo systemctl restart postgresql

echo ""
echo -e "${YELLOW}[5/10] Instalando PM2...${NC}"
sudo npm install -g pm2

echo ""
echo -e "${YELLOW}[6/10] Instalando Nginx...${NC}"
sudo apt install -y nginx

echo ""
echo -e "${YELLOW}[7/10] Configurando Firewall...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000/tcp
echo "y" | sudo ufw enable

echo ""
echo -e "${YELLOW}[8/10] Instalando Certbot (SSL)...${NC}"
sudo apt install -y certbot python3-certbot-nginx

echo ""
echo -e "${YELLOW}[9/10] Instalando Git...${NC}"
sudo apt install -y git

echo ""
echo -e "${YELLOW}[10/10] Clonando repositorio...${NC}"
cd /home/azureuser
if [ -d "crm-ngso-whatsapp" ]; then
    echo "Repositorio ya existe, actualizando..."
    cd crm-ngso-whatsapp
    git pull origin feature/mejoras-crm-bot
else
    git clone https://github.com/sanalejo720/crm-bot-ngso.git crm-ngso-whatsapp
    cd crm-ngso-whatsapp
    git checkout feature/mejoras-crm-bot
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  SERVIDOR CONFIGURADO EXITOSAMENTE${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}SIGUIENTE PASO: Configurar variables de entorno${NC}"
echo ""
echo "1. Backend .env:"
echo "   nano /home/azureuser/crm-ngso-whatsapp/backend/.env.production"
echo ""
echo "2. Frontend .env:"
echo "   nano /home/azureuser/crm-ngso-whatsapp/frontend/.env.production"
echo ""
echo -e "${YELLOW}Credenciales de base de datos:${NC}"
echo "   Usuario: crm_admin"
echo "   Password: $DB_PASSWORD"
echo "   Database: crm_whatsapp"
echo ""
echo -e "${YELLOW}JWT Secret:${NC}"
echo "   $JWT_SECRET"
echo ""
