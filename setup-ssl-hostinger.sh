#!/bin/bash

# ====================================================================
# Script para Configurar SSL con Let's Encrypt en Hostinger
# CRM NGSO WhatsApp
# ====================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variable de dominio
DOMAIN="ngso-chat.assoftware.xyz"
EMAIL="san.alejo0720@gmail.com"

echo ""
echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}   CONFIGURACIÓN SSL - LET'S ENCRYPT${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Este script debe ejecutarse como root o con sudo${NC}"
   exit 1
fi

# Verificar que Certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando Certbot...${NC}"
    apt install -y certbot python3-certbot-nginx
fi

# Verificar DNS
echo -e "${YELLOW}🔍 Verificando configuración DNS...${NC}"
RESOLVED_IP=$(dig +short $DOMAIN | tail -n1)
SERVER_IP=$(curl -s ifconfig.me)

echo "   Dominio: $DOMAIN"
echo "   Resuelve a: $RESOLVED_IP"
echo "   IP del servidor: $SERVER_IP"
echo ""

if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    echo -e "${RED}⚠️  ADVERTENCIA: El dominio no apunta a este servidor${NC}"
    echo -e "${YELLOW}   Por favor, configura un registro A en tu DNS apuntando a: $SERVER_IP${NC}"
    echo ""
    read -p "¿Deseas continuar de todas formas? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Obtener certificado SSL
echo ""
echo -e "${YELLOW}🔐 Obteniendo certificado SSL...${NC}"
certbot --nginx -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

# Verificar renovación automática
echo ""
echo -e "${YELLOW}🔄 Configurando renovación automática...${NC}"
systemctl enable certbot.timer
systemctl start certbot.timer

# Probar renovación
echo ""
echo -e "${YELLOW}🧪 Probando proceso de renovación...${NC}"
certbot renew --dry-run

echo ""
echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}   ✅ SSL CONFIGURADO EXITOSAMENTE${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo ""
echo -e "${YELLOW}📋 Información del certificado:${NC}"
certbot certificates
echo ""
echo -e "${YELLOW}🌐 Tu sitio ahora está disponible en HTTPS:${NC}"
echo "   https://$DOMAIN"
echo ""
echo -e "${YELLOW}🔄 Renovación automática configurada${NC}"
echo "   Certbot renovará automáticamente el certificado antes de que expire"
echo ""
echo -e "${GREEN}¡Configuración SSL completada! 🎉${NC}"
echo ""
