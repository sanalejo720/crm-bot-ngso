#!/bin/bash
# Script de Pruebas Funcionales - CRM NGS&O
# Ejecutar EN el servidor: bash test-functionality.sh

echo "============================================"
echo "  PRUEBAS FUNCIONALES - CRM NGS&O"
echo "  chat-ngso.assoftware.cloud"
echo "============================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar resultado
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        FAILED=$((FAILED + 1))
    fi
}

FAILED=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PRUEBA 1: INFRAESTRUCTURA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend PM2
pm2 status | grep -q "online"
check_result $? "Backend PM2 está online"

# Nginx
systemctl is-active --quiet nginx
check_result $? "Nginx está activo"

# PostgreSQL
systemctl is-active --quiet postgresql
check_result $? "PostgreSQL está activo"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 PRUEBA 2: CONECTIVIDAD HTTPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Frontend HTTPS
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://chat-ngso.assoftware.cloud/)
[ "$STATUS" = "200" ]
check_result $? "Frontend accesible (HTTPS 200)"

# Redirect HTTP → HTTPS
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://chat-ngso.assoftware.cloud/)
[ "$STATUS" = "301" ]
check_result $? "Redirect HTTP → HTTPS (301)"

# SSL válido
echo | openssl s_client -servername chat-ngso.assoftware.cloud -connect 72.61.73.9:443 2>/dev/null | grep -q "Verify return code: 0"
check_result $? "Certificado SSL válido"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 PRUEBA 3: API BACKEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Health endpoint del backend
curl -s http://localhost:3000/api/v1/auth/login -X POST -H "Content-Type: application/json" > /dev/null
check_result $? "Backend responde en localhost:3000"

# API a través de Nginx
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://chat-ngso.assoftware.cloud/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{}')
[ "$STATUS" = "400" ] || [ "$STATUS" = "401" ]
check_result $? "API accesible vía Nginx proxy (/api/v1/)"

# Socket.IO endpoint
curl -s http://localhost:3000/socket.io/ | grep -qE "message|Transport"
check_result $? "Socket.IO endpoint accesible"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  PRUEBA 4: BASE DE DATOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Conexión a BD
PGPASSWORD=CRM_NgsoPass2024! psql -U crm_admin -h localhost -d crm_whatsapp -c "SELECT 1;" > /dev/null 2>&1
check_result $? "Conexión a PostgreSQL"

# Tablas principales
TABLES=$(sudo -u postgres psql -d crm_whatsapp -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
[ "$TABLES" -gt 20 ]
check_result $? "Tablas de la BD creadas (${TABLES} tablas)"

# Datos migrados
USERS=$(sudo -u postgres psql -d crm_whatsapp -t -c "SELECT COUNT(*) FROM users;" | xargs)
[ "$USERS" -gt 0 ]
check_result $? "Usuarios migrados (${USERS} usuarios)"

DEBTORS=$(sudo -u postgres psql -d crm_whatsapp -t -c "SELECT COUNT(*) FROM debtors;" | xargs)
[ "$DEBTORS" -gt 0 ]
check_result $? "Deudores migrados (${DEBTORS} deudores)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ PRUEBA 5: OPERACIONES DIARIAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Tabla daily_operations existe
sudo -u postgres psql -d crm_whatsapp -c "SELECT 1 FROM daily_operations LIMIT 1;" > /dev/null 2>&1
check_result $? "Tabla daily_operations creada"

# Scripts existen
[ -f /var/www/crm-ngso-whatsapp/backend/scripts/daily-opening.js ]
check_result $? "Script de apertura diaria existe"

[ -f /var/www/crm-ngso-whatsapp/backend/scripts/daily-closing.js ]
check_result $? "Script de cierre diario existe"

# Cron jobs configurados
CRON_COUNT=$(crontab -l | grep -c "CRM NGS&O")
[ "$CRON_COUNT" -gt 0 ]
check_result $? "Cron jobs configurados (${CRON_COUNT} jobs)"

# Probar script de apertura
cd /var/www/crm-ngso-whatsapp/backend && node scripts/daily-opening.js > /tmp/test-opening.log 2>&1
check_result $? "Script de apertura ejecuta correctamente"

# Probar script de cierre
cd /var/www/crm-ngso-whatsapp/backend && node scripts/daily-closing.js > /tmp/test-closing.log 2>&1
check_result $? "Script de cierre ejecuta correctamente"

# Verificar que se creó el reporte
ls /var/www/crm-ngso-whatsapp/backend/reports/reporte_*.json > /dev/null 2>&1
check_result $? "Reporte diario se genera correctamente"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 PRUEBA 6: ARCHIVOS ESTÁTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Frontend index.html
[ -f /var/www/crm-ngso-whatsapp/frontend/dist/index.html ]
check_result $? "index.html del frontend existe"

# Assets
[ -d /var/www/crm-ngso-whatsapp/frontend/dist/assets ]
check_result $? "Carpeta assets del frontend existe"

# JavaScript con MIME correcto
JSFILE=$(ls /var/www/crm-ngso-whatsapp/frontend/dist/assets/*.js 2>/dev/null | head -1 | xargs basename)
MIME=$(curl -sI https://chat-ngso.assoftware.cloud/assets/$JSFILE 2>/dev/null | grep -i "content-type" | grep -c "javascript")
[ "$MIME" -gt 0 ]
check_result $? "Archivos JS sirven con MIME type correcto"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 PRUEBA 7: SEGURIDAD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# HTTPS obligatorio
curl -sI http://chat-ngso.assoftware.cloud/ | grep -q "301"
check_result $? "HTTP redirige a HTTPS"

# Headers de seguridad
curl -sI https://chat-ngso.assoftware.cloud/ | grep -qi "strict-transport-security"
check_result $? "HSTS habilitado" || echo -e "${YELLOW}  ⚠ Opcional pero recomendado${NC}"

# Firewall activo
ufw status | grep -q "Status: active"
check_result $? "Firewall UFW activo"

echo ""
echo "============================================"
echo "  RESUMEN DE PRUEBAS"
echo "============================================"
echo ""

TOTAL=25
PASSED=$((TOTAL - FAILED))

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ TODAS LAS PRUEBAS PASARON (${PASSED}/${TOTAL})${NC}"
    echo ""
    echo "🎉 El sistema está completamente funcional"
else
    echo -e "${YELLOW}⚠ PRUEBAS COMPLETADAS: ${PASSED}/${TOTAL} exitosas${NC}"
    echo -e "${RED}✗ FALLOS: ${FAILED}${NC}"
fi

echo ""
echo "============================================"
echo "  INFORMACIÓN DEL SISTEMA"
echo "============================================"
echo "URL: https://chat-ngso.assoftware.cloud"
echo "Backend: PM2 process 'crm-backend'"
echo "Base de datos: PostgreSQL crm_whatsapp"
echo "Operaciones diarias: 8 AM apertura, 6 PM cierre"
echo "============================================"

exit $FAILED
