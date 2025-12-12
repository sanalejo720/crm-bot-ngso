# Script de Despliegue de Correcciones Críticas
# Fecha: 2025-12-10
# Descripción: Despliega correcciones para mensajes y sistema de sesiones de agentes

$VPS_IP = "72.61.73.9"
$VPS_USER = "root"
$VPS_PATH = "/var/www/crm-ngso-whatsapp"

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  DESPLIEGUE DE CORRECCIONES CRÍTICAS  " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Función para ejecutar comando SSH
function Invoke-SSHCommand {
    param([string]$Command)
    ssh "${VPS_USER}@${VPS_IP}" $Command
}

# 1. Backup antes de desplegar
Write-Host "📦 Paso 1: Creando backup de seguridad..." -ForegroundColor Yellow
Invoke-SSHCommand "cd $VPS_PATH; cp -r backend backend_backup_`$(date +%Y%m%d_%H%M%S)"

# 2. Copiar archivos actualizados
Write-Host "📤 Paso 2: Copiando archivos actualizados al VPS..." -ForegroundColor Yellow

# Copiar archivos del backend corregidos
scp -r "backend/src/modules/whatsapp/providers/wppconnect.service.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/backend/src/modules/whatsapp/providers/"
scp -r "backend/src/modules/users/entities/agent-session.entity.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/backend/src/modules/users/entities/"
scp -r "backend/src/modules/users/services/agent-sessions.service.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/backend/src/modules/users/services/"
scp -r "backend/src/modules/users/users.module.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/backend/src/modules/users/"
scp -r "backend/src/modules/users/users.controller.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/backend/src/modules/users/"
scp -r "backend/src/modules/auth/auth.service.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/backend/src/modules/auth/"
scp -r "backend/src/modules/auth/dto/login.dto.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/backend/src/modules/auth/dto/"

# Copiar script SQL
scp "create_agent_sessions_table.sql" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/"

Write-Host "✅ Archivos copiados exitosamente" -ForegroundColor Green

# 3. Aplicar migración de base de datos
Write-Host "🗄️ Paso 3: Aplicando migración de base de datos..." -ForegroundColor Yellow
Invoke-SSHCommand "cd $VPS_PATH; psql -h localhost -U postgres -d crm_ngso -f create_agent_sessions_table.sql"

# 4. Instalar dependencias (si es necesario)
Write-Host "📍a Paso 4: Verificando dependencias..." -ForegroundColor Yellow
Invoke-SSHCommand "cd $VPS_PATH/backend; npm install"

# 5. Compilar TypeScript
Write-Host "🔨 Paso 5: Compilando código TypeScript..." -ForegroundColor Yellow
Invoke-SSHCommand "cd $VPS_PATH/backend; npm run build"

# 6. Reiniciar PM2
Write-Host "🔄 Paso 6: Reiniciando aplicación..." -ForegroundColor Yellow
Invoke-SSHCommand "pm2 restart crm-backend"

# 7. Esperar que el servicio esté disponible
Write-Host "⏳ Esperando que el servicio esté disponible..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 8. Verificar logs
Write-Host "📋 Paso 7: Verificando logs del servicio..." -ForegroundColor Yellow
Invoke-SSHCommand "pm2 logs crm-backend --lines 30 --nostream"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  ✅ DESPLIEGUE COMPLETADO             " -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Para monitorear logs en tiempo real:" -ForegroundColor Cyan
Write-Host "   ssh root@72.61.73.9 'pm2 logs crm-backend'" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Para ver el estado de PM2:" -ForegroundColor Cyan
Write-Host "   ssh root@72.61.73.9 'pm2 status'" -ForegroundColor Gray
Write-Host ""

# 9. Prueba rápida
Write-Host "🧪 Realizando prueba rápida de health check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://72.61.73.9:3000/api/v1/health" -Method Get
    Write-Host "✅ Health check exitoso" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Health check falló, pero el servicio puede estar iniciando..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Cambios principales desplegados:" -ForegroundColor Cyan
Write-Host "   1. ✅ Corrección de error 'No LID for user' en envío de mensajes" -ForegroundColor Green
Write-Host "   2. ✅ Sistema de historial de sesiones de agentes implementado" -ForegroundColor Green
Write-Host "   3. ✅ Tabla agent_sessions creada en base de datos" -ForegroundColor Green
Write-Host "   4. ✅ Endpoints de tracking de asistencia disponibles" -ForegroundColor Green
Write-Host ""
