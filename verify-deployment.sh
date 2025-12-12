#!/bin/bash

# ====================================================================
# Script de Verificación Post-Despliegue
# CRM NGSO WhatsApp - Hostinger
# 
# Este script verifica que todos los servicios estén funcionando
# correctamente después del despliegue.
# ====================================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Contadores
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Funciones
print_section() {
    echo ""
    echo -e "${BLUE}======================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}======================================================================${NC}"
}

check_service() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if eval "$2"; then
        echo -e "${GREEN}✅ $1${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

check_port() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if sudo netstat -tulpn | grep -q ":$2 "; then
        echo -e "${GREEN}✅ $1 (Puerto $2 abierto)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ $1 (Puerto $2 no está escuchando)${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

check_url() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$2" -k --max-time 10)
    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
        echo -e "${GREEN}✅ $1 (HTTP $HTTP_CODE)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ $1 (HTTP $HTTP_CODE)${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# ====================================================================
# INICIO DE VERIFICACIONES
# ====================================================================

clear
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     VERIFICACIÓN POST-DESPLIEGUE - CRM NGSO WHATSAPP              ║${NC}"
echo -e "${CYAN}║     Hostinger VPS                                                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ====================================================================
# 1. SERVICIOS DEL SISTEMA
# ====================================================================

print_section "1. SERVICIOS DEL SISTEMA"

check_service "Node.js instalado" "command -v node > /dev/null 2>&1"
if command -v node > /dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo -e "   ${CYAN}Versión: $NODE_VERSION${NC}"
fi

check_service "NPM instalado" "command -v npm > /dev/null 2>&1"
if command -v npm > /dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo -e "   ${CYAN}Versión: $NPM_VERSION${NC}"
fi

check_service "PM2 instalado" "command -v pm2 > /dev/null 2>&1"
if command -v pm2 > /dev/null 2>&1; then
    PM2_VERSION=$(pm2 --version)
    echo -e "   ${CYAN}Versión: $PM2_VERSION${NC}"
fi

check_service "PostgreSQL corriendo" "sudo systemctl is-active postgresql > /dev/null 2>&1"
check_service "Redis corriendo" "sudo systemctl is-active redis-server > /dev/null 2>&1"
check_service "Nginx corriendo" "sudo systemctl is-active nginx > /dev/null 2>&1"

# ====================================================================
# 2. BACKEND (PM2)
# ====================================================================

print_section "2. BACKEND - PM2"

check_service "Backend PM2 corriendo" "pm2 list | grep -q 'crm-backend.*online'"

if pm2 list | grep -q 'crm-backend'; then
    echo ""
    echo -e "${CYAN}Estado de PM2:${NC}"
    pm2 list | grep crm-backend
    
    echo ""
    echo -e "${CYAN}Últimas 10 líneas de logs:${NC}"
    pm2 logs crm-backend --lines 10 --nostream 2>/dev/null || echo "No se pudieron obtener logs"
fi

# ====================================================================
# 3. BASE DE DATOS
# ====================================================================

print_section "3. BASE DE DATOS - POSTGRESQL"

check_service "PostgreSQL aceptando conexiones" "pg_isready > /dev/null 2>&1"

# Verificar conexión a la base de datos
PGPASSWORD="CRM_NgsoPass2024!" psql -U crm_admin -d crm_whatsapp -h localhost -c "SELECT 1;" > /dev/null 2>&1
check_service "Conexión a BD crm_whatsapp" "[ $? -eq 0 ]"

if [ $? -eq 0 ]; then
    # Contar tablas
    TABLE_COUNT=$(PGPASSWORD="CRM_NgsoPass2024!" psql -U crm_admin -d crm_whatsapp -h localhost -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    echo -e "   ${CYAN}Tablas en la BD: $TABLE_COUNT${NC}"
fi

# ====================================================================
# 4. REDIS
# ====================================================================

print_section "4. REDIS"

check_service "Redis respondiendo" "redis-cli ping | grep -q PONG"

if redis-cli ping | grep -q PONG; then
    REDIS_KEYS=$(redis-cli DBSIZE | cut -d ':' -f 2)
    echo -e "   ${CYAN}Claves en Redis: $REDIS_KEYS${NC}"
fi

# ====================================================================
# 5. NGINX
# ====================================================================

print_section "5. NGINX - WEB SERVER"

check_service "Configuración de Nginx válida" "sudo nginx -t > /dev/null 2>&1"
check_service "Nginx escuchando en puerto 80" "sudo netstat -tulpn | grep -q ':80.*nginx'"
check_service "Nginx escuchando en puerto 443" "sudo netstat -tulpn | grep -q ':443.*nginx'"

# ====================================================================
# 6. PUERTOS
# ====================================================================

print_section "6. PUERTOS"

check_port "Backend API" "3000"
check_port "PostgreSQL" "5432"
check_port "Redis" "6379"
check_port "HTTP" "80"
check_port "HTTPS" "443"

# ====================================================================
# 7. ENDPOINTS HTTP/HTTPS
# ====================================================================

print_section "7. ENDPOINTS HTTP/HTTPS"

# Obtener el dominio o IP
DOMAIN="ngso-chat.assoftware.xyz"

check_url "Frontend HTTP" "http://localhost"
check_url "Frontend HTTPS" "https://$DOMAIN"
check_url "Backend API Health" "https://$DOMAIN/api/v1/health"
check_url "Backend API Root" "https://$DOMAIN/api/v1"
check_url "Swagger Docs" "https://$DOMAIN/api/docs"

# ====================================================================
# 8. SSL/TLS
# ====================================================================

print_section "8. SSL/TLS"

if command -v certbot > /dev/null 2>&1; then
    echo -e "${CYAN}Certificados SSL:${NC}"
    sudo certbot certificates 2>/dev/null | grep -A 3 "Certificate Name" || echo "No se encontraron certificados"
    echo ""
fi

# ====================================================================
# 9. RECURSOS DEL SISTEMA
# ====================================================================

print_section "9. RECURSOS DEL SISTEMA"

echo -e "${CYAN}Uso de CPU:${NC}"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "   " 100 - $1"%"}'

echo ""
echo -e "${CYAN}Uso de RAM:${NC}"
free -h | awk 'NR==2{printf "   Usado: %s / %s (%.2f%%)\n", $3,$2,$3*100/$2 }'

echo ""
echo -e "${CYAN}Uso de Disco:${NC}"
df -h / | awk 'NR==2{printf "   Usado: %s / %s (%s)\n", $3,$2,$5}'

# ====================================================================
# 10. ARCHIVOS Y DIRECTORIOS
# ====================================================================

print_section "10. ARCHIVOS Y DIRECTORIOS"

check_service "Directorio backend existe" "[ -d /root/crm-ngso-whatsapp/backend ]"
check_service "Directorio frontend existe" "[ -d /root/crm-ngso-whatsapp/frontend ]"
check_service "Backend compilado (dist/)" "[ -d /root/crm-ngso-whatsapp/backend/dist ]"
check_service "Frontend compilado (dist/)" "[ -d /root/crm-ngso-whatsapp/frontend/dist ]"
check_service "Backend main.js existe" "[ -f /root/crm-ngso-whatsapp/backend/dist/main.js ]"
check_service "Frontend index.html existe" "[ -f /root/crm-ngso-whatsapp/frontend/dist/index.html ]"

# ====================================================================
# RESUMEN FINAL
# ====================================================================

echo ""
print_section "RESUMEN DE VERIFICACIÓN"
echo ""

SUCCESS_RATE=$(echo "scale=2; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)

echo -e "  ${CYAN}Total de verificaciones: $TOTAL_CHECKS${NC}"
echo -e "  ${GREEN}✅ Exitosas:            $PASSED_CHECKS${NC}"
echo -e "  ${RED}❌ Fallidas:            $FAILED_CHECKS${NC}"
echo ""
echo -e "  ${CYAN}Tasa de éxito:          ${SUCCESS_RATE}%${NC}"
echo ""

if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     ✅ TODAS LAS VERIFICACIONES PASARON                            ║${NC}"
    echo -e "${GREEN}║     Sistema funcionando correctamente                              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    EXIT_CODE=0
elif [ "$FAILED_CHECKS" -le 3 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║     ⚠️  ALGUNAS VERIFICACIONES FALLARON                            ║${NC}"
    echo -e "${YELLOW}║     Revisar servicios que fallaron                                 ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════════╝${NC}"
    EXIT_CODE=1
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     ❌ MÚLTIPLES VERIFICACIONES FALLARON                           ║${NC}"
    echo -e "${RED}║     Revisar configuración del sistema                              ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════╝${NC}"
    EXIT_CODE=1
fi

echo ""
echo -e "${CYAN}Comandos útiles para diagnóstico:${NC}"
echo -e "  pm2 logs crm-backend          # Ver logs del backend"
echo -e "  sudo tail -f /var/log/nginx/crm-error.log  # Ver logs de Nginx"
echo -e "  sudo systemctl status postgresql  # Estado de PostgreSQL"
echo -e "  redis-cli ping                # Verificar Redis"
echo ""

exit $EXIT_CODE
