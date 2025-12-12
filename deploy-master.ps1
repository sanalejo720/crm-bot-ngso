# ====================================================================
# Script Maestro de Despliegue Completo
# CRM NGSO WhatsApp - Hostinger
# 
# Este script ejecuta todo el proceso de despliegue y testing
# de manera automatizada y secuencial.
# ====================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$HostingerIP = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDeploy = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTesting = $false
)

# Variables globales
$SSH_KEY = "C:\Users\alejo\.ssh\key_vps"
$LOCAL_DIR = "d:\crm-ngso-whatsapp"
$REMOTE_USER = "root"

# Colores
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Print-Section {
    param($Title)
    Write-Host ""
    Write-ColorOutput Cyan "═══════════════════════════════════════════════════════════════════"
    Write-ColorOutput Cyan "  $Title"
    Write-ColorOutput Cyan "═══════════════════════════════════════════════════════════════════"
}

function Print-Success {
    param($Message)
    Write-ColorOutput Green "OK: $Message"
}

function Print-Error {
    param($Message)
    Write-ColorOutput Red "ERROR: $Message"
}

function Print-Info {
    param($Message)
    Write-ColorOutput Cyan "INFO: $Message"
}

function Print-Warning {
    param($Message)
    Write-ColorOutput Yellow "ADVERTENCIA: $Message"
}

# Banner principal
Clear-Host
Write-Host ""
Write-ColorOutput Cyan "===================================================================="
Write-ColorOutput Cyan "     DESPLIEGUE COMPLETO Y TESTING - CRM NGSO WHATSAPP             "
Write-ColorOutput Cyan "     Hostinger VPS                                                  "
Write-ColorOutput Cyan "===================================================================="
Write-Host ""

# ====================================================================
# PASO 1: VALIDAR REQUISITOS
# ====================================================================

Print-Section "PASO 1: VALIDAR REQUISITOS"

# Solicitar IP si no se proporcionó
if ([string]::IsNullOrEmpty($HostingerIP)) {
    Write-Host ""
    $HostingerIP = Read-Host "Ingresa la IP de tu VPS Hostinger"
}

Print-Info "IP del servidor: $HostingerIP"

# Verificar clave SSH
if (-Not (Test-Path $SSH_KEY)) {
    Print-Error "No se encuentra la clave SSH en: $SSH_KEY"
    exit 1
}
Print-Success "Clave SSH encontrada"

# Verificar directorio local
if (-Not (Test-Path $LOCAL_DIR)) {
    Print-Error "Directorio del proyecto no encontrado: $LOCAL_DIR"
    exit 1
}
Print-Success "Directorio del proyecto encontrado"

# Verificar Node.js
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Print-Success "Node.js instalado: $nodeVersion"
} else {
    Print-Error "Node.js no está instalado"
    exit 1
}

# Verificar NPM
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Print-Success "NPM instalado: $npmVersion"
} else {
    Print-Error "NPM no está instalado"
    exit 1
}

# Probar conexión SSH
Print-Info "Probando conexión SSH..."
$testConnection = ssh -i $SSH_KEY -o ConnectTimeout=5 -o BatchMode=yes ${REMOTE_USER}@${HostingerIP} "echo OK" 2>&1

if ($LASTEXITCODE -ne 0) {
    Print-Error "No se puede conectar al servidor"
    Print-Warning "Verifica que:"
    Print-Warning "  1. La IP es correcta: $HostingerIP"
    Print-Warning "  2. La clave SSH está agregada en el panel de Hostinger"
    Print-Warning "  3. El firewall permite conexiones SSH"
    exit 1
}
Print-Success "Conexión SSH exitosa"

# ====================================================================
# PASO 2: DESPLIEGUE
# ====================================================================

if (-Not $SkipDeploy) {
    Print-Section "PASO 2: DESPLIEGUE EN HOSTINGER"
    
    Print-Info "Iniciando despliegue automatizado..."
    Write-Host ""
    
    # Ejecutar script de despliegue
    & "$LOCAL_DIR\deploy-from-windows.ps1"
    
    if ($LASTEXITCODE -ne 0) {
        Print-Error "Error durante el despliegue"
        Print-Warning "Revisa los logs anteriores para más detalles"
        exit 1
    }
    
    Print-Success "Despliegue completado"
} else {
    Print-Warning "Despliegue omitido (flag -SkipDeploy)"
}

# ====================================================================
# PASO 3: VERIFICACIÓN POST-DESPLIEGUE
# ====================================================================

Print-Section "PASO 3: VERIFICACIÓN POST-DESPLIEGUE"

Print-Info "Ejecutando verificación en el servidor..."
Write-Host ""

$verifyScript = @"
bash /root/crm-ngso-whatsapp/verify-deployment.sh
"@

ssh -i $SSH_KEY ${REMOTE_USER}@${HostingerIP} $verifyScript

if ($LASTEXITCODE -ne 0) {
    Print-Warning "Algunas verificaciones fallaron"
    Print-Info "Continua con el siguiente paso para diagnosticar"
} else {
    Print-Success "Todas las verificaciones pasaron"
}

# ====================================================================
# PASO 4: TESTING DE ENDPOINTS
# ====================================================================

if (-Not $SkipTesting) {
    Print-Section "PASO 4: TESTING DE ENDPOINTS"
    
    Print-Info "Esperando 10 segundos para que los servicios se estabilicen..."
    Start-Sleep -Seconds 10
    
    Print-Info "Verificando dependencias de testing..."
    
    # Verificar si axios está instalado
    Set-Location $LOCAL_DIR
    $axiosInstalled = npm list axios 2>&1 | Select-String "axios@"
    
    if (-Not $axiosInstalled) {
        Print-Warning "Axios no está instalado, instalando..."
        npm install axios
    } else {
        Print-Success "Axios está instalado"
    }
    
    Print-Info "Ejecutando tests de endpoints..."
    Write-Host ""
    
    # Ejecutar tests
    node test-production-endpoints.js
    
    $testExitCode = $LASTEXITCODE
    
    Write-Host ""
    
    if ($testExitCode -eq 0) {
        Print-Success "Todos los tests pasaron"
    } else {
        Print-Warning "Algunos tests fallaron"
        Print-Info "Revisa los resultados anteriores para más detalles"
    }
} else {
    Print-Warning "Testing omitido (flag -SkipTesting)"
}

# ====================================================================
# PASO 5: VERIFICACIÓN VISUAL
# ====================================================================

Print-Section "PASO 5: VERIFICACIÓN VISUAL"

$DOMAIN = "ngso-chat.assoftware.xyz"

Print-Info "Abriendo URLs en el navegador para verificación manual..."
Write-Host ""

Start-Sleep -Seconds 2

# Abrir URLs en navegador
Print-Info "Abriendo Frontend..."
Start-Process "https://$DOMAIN"

Start-Sleep -Seconds 2

Print-Info "Abriendo Backend API Health..."
Start-Process "https://$DOMAIN/api/v1/health"

Start-Sleep -Seconds 2

Print-Info "Abriendo Swagger Docs..."
Start-Process "https://$DOMAIN/api/docs"

Write-Host ""
Print-Info "Verifica visualmente que:"
Print-Info "  1. El frontend carga correctamente"
Print-Info "  2. El backend API responde"
Print-Info "  3. Swagger docs está accesible"
Print-Info "  4. No hay errores de SSL"

# ====================================================================
# PASO 6: LOGS Y MONITOREO
# ====================================================================

Print-Section "PASO 6: LOGS Y MONITOREO"

Write-Host ""
$viewLogs = Read-Host "Deseas ver los logs del backend en el servidor? (s/n)"

if ($viewLogs -eq "s" -or $viewLogs -eq "S") {
    Print-Info "Conectando al servidor para ver logs..."
    Print-Info "Presiona Ctrl+C para salir de los logs"
    Start-Sleep -Seconds 2
    
    ssh -i $SSH_KEY ${REMOTE_USER}@${HostingerIP} "pm2 logs crm-backend"
}

# ====================================================================
# RESUMEN FINAL
# ====================================================================

Write-Host ""
Print-Section "RESUMEN FINAL"
Write-Host ""

Print-Success "Proceso de despliegue y testing completado"
Write-Host ""

Write-ColorOutput Cyan "URLs de acceso:"
Write-Host "  Frontend:    https://$DOMAIN"
Write-Host "  Backend API: https://$DOMAIN/api/v1"
Write-Host "  Swagger:     https://$DOMAIN/api/docs"
Write-Host ""

Write-ColorOutput Cyan "Comandos útiles:"
Write-Host "  # Conectar al servidor"
Write-Host "  ssh -i `"$SSH_KEY`" ${REMOTE_USER}@${HostingerIP}"
Write-Host ""
Write-Host "  # Ver logs del backend"
Write-Host "  pm2 logs crm-backend"
Write-Host ""
Write-Host "  # Verificar servicios"
Write-Host "  bash /root/crm-ngso-whatsapp/verify-deployment.sh"
Write-Host ""
Write-Host "  # Reiniciar backend"
Write-Host "  pm2 restart crm-backend"
Write-Host ""

Write-ColorOutput Cyan "Próximos pasos:"
Write-Host "  1. Crear usuario administrador (si no existe)"
Write-Host "  2. Configurar número WhatsApp"
Write-Host "  3. Crear usuarios del equipo"
Write-Host "  4. Realizar pruebas funcionales completas"
Write-Host ""

Write-ColorOutput Green "===================================================================="
Write-ColorOutput Green "     PROCESO COMPLETADO EXITOSAMENTE                                "
Write-ColorOutput Green "===================================================================="
Write-Host ""

# ====================================================================
# OPCIONES FINALES
# ====================================================================

$action = Read-Host "Que deseas hacer ahora? (1=Conectar SSH, 2=Ver logs, 3=Salir)"

switch ($action) {
    "1" {
        Print-Info "Conectando al servidor..."
        ssh -i $SSH_KEY ${REMOTE_USER}@${HostingerIP}
    }
    "2" {
        Print-Info "Mostrando logs del backend..."
        ssh -i $SSH_KEY ${REMOTE_USER}@${HostingerIP} "pm2 logs crm-backend"
    }
    "3" {
        Print-Info "Hasta pronto!"
    }
    default {
        Print-Info "Opcion no valida. Saliendo..."
    }
}

Write-Host ""
