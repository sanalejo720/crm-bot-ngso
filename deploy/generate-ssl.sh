#!/bin/bash
# Script para generar certificado SSL con Certbot
# Ejecutar EN el servidor nuevo después de actualizar DNS

DOMAIN="chat-ngso.assoftware.cloud"
EMAIL="admin@assoftware.xyz"

echo "============================================"
echo "  Generando Certificado SSL"
echo "============================================"
echo ""

# Verificar DNS
echo "Verificando DNS..."
IP=$(dig +short $DOMAIN | tail -1)
echo "DNS apunta a: $IP"

if [ "$IP" != "72.61.73.9" ]; then
    echo "❌ ERROR: El DNS no apunta a este servidor"
    echo "Actualiza el registro A de $DOMAIN a 72.61.73.9"
    exit 1
fi

echo "✓ DNS configurado correctamente"
echo ""

# Generar certificado
echo "Generando certificado SSL..."
certbot --nginx -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "  ✓ SSL Configurado Exitosamente"
    echo "============================================"
    echo ""
    echo "Verificar en: https://$DOMAIN"
    echo ""
    
    # Configurar renovación automática
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    echo "✓ Renovación automática configurada"
else
    echo "❌ Error al generar certificado SSL"
    exit 1
fi
