# ====================================================================
# Script de Despliegue desde Windows a Hostinger
# CRM NGSO WhatsApp - Sistema de Cobranzas
# Ejecutar en PowerShell como Administrador
# ====================================================================

# Variables de configuración
$SSH_KEY = "C:\Users\alejo\.ssh\key_vps"
$HOSTINGER_IP = ""  # Ingresar IP del VPS Hostinger
$SSH_USER = "root"
$REMOTE_DIR = "/root/crm-ngso-whatsapp"
$LOCAL_DIR = "d:\crm-ngso-whatsapp"

# Colores para mensajes
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Print-Step {
    param($Step, $Message)
    Write-Host ""
    Write-ColorOutput Yellow "[$Step] $Message"
    Write-Host "---------------------------------------------------------------------"
}

function Print-Success {
    param($Message)
    Write-ColorOutput Green "✅ $Message"
}

function Print-Error {
    param($Message)
    Write-ColorOutput Red "❌ $Message"
}

function Print-Info {
    param($Message)
    Write-ColorOutput Cyan "ℹ️  $Message"
}

Write-Host ""
Write-ColorOutput Cyan "====================================================================="
Write-ColorOutput Cyan "   DESPLIEGUE CRM NGSO - DESDE WINDOWS A HOSTINGER"
Write-ColorOutput Cyan "====================================================================="
Write-Host ""

# ====================================================================
# PARTE 1: VALIDAR REQUISITOS
# ====================================================================

Print-Step "1/7" "Validando requisitos..."

# Verificar que existe la clave SSH
if (-Not (Test-Path $SSH_KEY)) {
    Print-Error "No se encuentra la clave SSH en: $SSH_KEY"
    exit 1
}
Print-Success "Clave SSH encontrada"

# Solicitar IP del servidor si no está configurada
if ([string]::IsNullOrEmpty($HOSTINGER_IP)) {
    Write-Host ""
    $HOSTINGER_IP = Read-Host "Ingresa la IP de tu VPS Hostinger"
}

# Verificar conexión SSH
Print-Info "Probando conexión SSH a $HOSTINGER_IP..."
$testConnection = ssh -i $SSH_KEY -o ConnectTimeout=5 -o BatchMode=yes ${SSH_USER}@${HOSTINGER_IP} "echo OK" 2>&1

if ($LASTEXITCODE -ne 0) {
    Print-Error "No se puede conectar al servidor Hostinger"
    Print-Info "Verifica que:"
    Print-Info "  1. La IP es correcta: $HOSTINGER_IP"
    Print-Info "  2. Tu clave SSH pública está agregada en el panel de Hostinger"
    Print-Info "  3. El firewall permite conexiones SSH"
    exit 1
}
Print-Success "Conexión SSH exitosa"

# ====================================================================
# PARTE 2: COMPILAR BACKEND
# ====================================================================

Print-Step "2/7" "Compilando backend..."
Set-Location "$LOCAL_DIR\backend"

if (-Not (Test-Path "node_modules")) {
    Print-Info "Instalando dependencias del backend..."
    npm install
}

Print-Info "Compilando backend..."
npm run build

if (-Not (Test-Path "dist\main.js")) {
    Print-Error "Error al compilar backend"
    exit 1
}
Print-Success "Backend compilado exitosamente"

# ====================================================================
# PARTE 3: COMPILAR FRONTEND
# ====================================================================

Print-Step "3/7" "Compilando frontend..."
Set-Location "$LOCAL_DIR\frontend"

# Verificar que existe .env.production
if (-Not (Test-Path ".env.production")) {
    Print-Info "Creando .env.production para frontend..."
    @"
# API Backend
VITE_API_URL=https://ngso-chat.assoftware.xyz/api/v1

# WebSocket
VITE_SOCKET_URL=https://ngso-chat.assoftware.xyz
"@ | Out-File -FilePath ".env.production" -Encoding utf8
}

if (-Not (Test-Path "node_modules")) {
    Print-Info "Instalando dependencias del frontend..."
    npm install
}

Print-Info "Compilando frontend..."
npm run build

if (-Not (Test-Path "dist\index.html")) {
    Print-Error "Error al compilar frontend"
    exit 1
}
Print-Success "Frontend compilado exitosamente"

# ====================================================================
# PARTE 4: CREAR ARCHIVO COMPRIMIDO
# ====================================================================

Print-Step "4/7" "Creando archivo comprimido para transferencia..."
Set-Location $LOCAL_DIR

# Crear carpeta temporal para archivos a subir
$TEMP_DIR = "$env:TEMP\crm-deploy"
if (Test-Path $TEMP_DIR) {
    Remove-Item -Recurse -Force $TEMP_DIR
}
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

# Copiar backend compilado
Print-Info "Copiando backend..."
Copy-Item -Path "backend\dist" -Destination "$TEMP_DIR\backend\dist" -Recurse
Copy-Item -Path "backend\package.json" -Destination "$TEMP_DIR\backend\"
Copy-Item -Path "backend\package-lock.json" -Destination "$TEMP_DIR\backend\"
Copy-Item -Path "backend\.env.production" -Destination "$TEMP_DIR\backend\" -ErrorAction SilentlyContinue

# Copiar frontend compilado
Print-Info "Copiando frontend..."
Copy-Item -Path "frontend\dist" -Destination "$TEMP_DIR\frontend\dist" -Recurse

# Copiar scripts de despliegue
Print-Info "Copiando scripts..."
Copy-Item -Path "deploy-hostinger.sh" -Destination "$TEMP_DIR\"
Copy-Item -Path "setup-ssl-hostinger.sh" -Destination "$TEMP_DIR\"

# Comprimir archivos
Print-Info "Comprimiendo archivos..."
$DEPLOY_ZIP = "$LOCAL_DIR\crm-deploy.zip"
if (Test-Path $DEPLOY_ZIP) {
    Remove-Item $DEPLOY_ZIP
}
Compress-Archive -Path "$TEMP_DIR\*" -DestinationPath $DEPLOY_ZIP

Print-Success "Archivo comprimido creado: crm-deploy.zip"

# ====================================================================
# PARTE 5: SUBIR ARCHIVOS AL SERVIDOR
# ====================================================================

Print-Step "5/7" "Subiendo archivos al servidor Hostinger..."

# Subir archivo comprimido
Print-Info "Transfiriendo crm-deploy.zip (puede tomar unos minutos)..."
scp -i $SSH_KEY $DEPLOY_ZIP ${SSH_USER}@${HOSTINGER_IP}:/root/

if ($LASTEXITCODE -ne 0) {
    Print-Error "Error al subir archivos"
    exit 1
}
Print-Success "Archivos subidos exitosamente"

# ====================================================================
# PARTE 6: DESCOMPRIMIR Y CONFIGURAR EN SERVIDOR
# ====================================================================

Print-Step "6/7" "Descomprimiendo y configurando en servidor..."

$REMOTE_COMMANDS = @"
# Instalar unzip si no está
command -v unzip >/dev/null 2>&1 || apt install -y unzip

# Crear backup de la versión anterior (si existe)
if [ -d "$REMOTE_DIR" ]; then
    echo "📦 Creando backup..."
    tar -czf /root/crm-backup-\$(date +%Y%m%d_%H%M%S).tar.gz -C $REMOTE_DIR . 2>/dev/null || true
fi

# Crear directorio si no existe
mkdir -p $REMOTE_DIR

# Descomprimir archivos
echo "📂 Descomprimiendo archivos..."
unzip -o /root/crm-deploy.zip -d $REMOTE_DIR

# Instalar dependencias de producción del backend
echo "📦 Instalando dependencias de producción..."
cd $REMOTE_DIR/backend
npm install --production

# Dar permisos de ejecución a scripts
chmod +x $REMOTE_DIR/*.sh

echo "✅ Archivos descomprimidos y configurados"
"@

ssh -i $SSH_KEY ${SSH_USER}@${HOSTINGER_IP} $REMOTE_COMMANDS

Print-Success "Archivos configurados en servidor"

# ====================================================================
# PARTE 7: REINICIAR SERVICIOS
# ====================================================================

Print-Step "7/7" "Reiniciando servicios..."

$RESTART_COMMANDS = @"
# Reiniciar backend con PM2
if command -v pm2 >/dev/null 2>&1; then
    echo "🔄 Reiniciando backend..."
    pm2 delete crm-backend 2>/dev/null || true
    cd $REMOTE_DIR/backend
    pm2 start dist/main.js --name crm-backend --env production
    pm2 save
else
    echo "⚠️  PM2 no está instalado. Ejecuta: deploy-hostinger.sh"
fi

# Recargar Nginx
if command -v nginx >/dev/null 2>&1; then
    echo "🌐 Recargando Nginx..."
    nginx -t && systemctl reload nginx
fi

echo ""
echo "✅ Servicios reiniciados"
echo ""
echo "📊 Estado del backend:"
pm2 status 2>/dev/null || echo "PM2 no disponible"
"@

ssh -i $SSH_KEY ${SSH_USER}@${HOSTINGER_IP} $RESTART_COMMANDS

Print-Success "Servicios reiniciados"

# Limpiar archivos temporales
Remove-Item -Recurse -Force $TEMP_DIR

# ====================================================================
# FINALIZACIÓN
# ====================================================================

Write-Host ""
Write-ColorOutput Green "====================================================================="
Write-ColorOutput Green "   ✅ DESPLIEGUE COMPLETADO EXITOSAMENTE"
Write-ColorOutput Green "====================================================================="
Write-Host ""
Write-ColorOutput Yellow "🌐 URLs de acceso:"
Write-Host "   Frontend: https://ngso-chat.assoftware.xyz"
Write-Host "   Backend:  https://ngso-chat.assoftware.xyz/api/v1"
Write-Host ""
Write-ColorOutput Yellow "📝 Próximos pasos:"
Write-Host "   1. Conectar al servidor: ssh -i $SSH_KEY ${SSH_USER}@${HOSTINGER_IP}"
Write-Host "   2. Ver logs: pm2 logs crm-backend"
Write-Host "   3. Verificar estado: pm2 status"
Write-Host ""
Write-ColorOutput Yellow "🔧 Si es la primera vez que despliegas:"
Write-Host "   1. Conecta al servidor"
Write-Host "   2. Ejecuta: bash $REMOTE_DIR/deploy-hostinger.sh"
Write-Host "   3. Configura SSL: bash $REMOTE_DIR/setup-ssl-hostinger.sh"
Write-Host ""
Write-ColorOutput Green "¡Despliegue completado! 🎉"
Write-Host ""

# Preguntar si desea conectar al servidor
$connect = Read-Host "¿Deseas conectar al servidor ahora? (s/n)"
if ($connect -eq "s" -or $connect -eq "S") {
    ssh -i $SSH_KEY ${SSH_USER}@${HOSTINGER_IP}
}
