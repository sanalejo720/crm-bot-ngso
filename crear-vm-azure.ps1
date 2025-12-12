# Script para crear VM en Azure para CRM NGSO WhatsApp
# Ejecutar con: .\crear-vm-azure.ps1

Write-Host "🚀 Creando infraestructura en Azure para CRM NGSO..." -ForegroundColor Cyan

# Variables de configuración
$resourceGroup = "rg-crm-ngso-prod"
$location = "eastus"
$vmName = "vm-crm-ngso-prod"
$vmSize = "Standard_B2ms"  # 2 vCPUs, 8GB RAM
$adminUser = "azureuser"
$image = "Ubuntu2204"
$sshKeyName = "crm-ngso-ssh-key"

Write-Host "`nConfiguracion:" -ForegroundColor Yellow
Write-Host "   - Grupo de recursos: $resourceGroup"
Write-Host "   - Ubicacion: $location"
Write-Host "   - Nombre VM: $vmName"
Write-Host "   - Tamano: $vmSize (2 vCPUs, 8GB RAM)"
Write-Host "   - Usuario: $adminUser"
Write-Host "   - Sistema: Ubuntu 22.04 LTS"

# 1. Crear grupo de recursos
Write-Host "`n🔧 [1/6] Creando grupo de recursos..." -ForegroundColor Green
az group create --name $resourceGroup --location $location --output table

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error creando grupo de recursos" -ForegroundColor Red
    exit 1
}

# 2. Crear red virtual
Write-Host "`n🌐 [2/6] Creando red virtual..." -ForegroundColor Green
az network vnet create `
    --resource-group $resourceGroup `
    --name vnet-crm-ngso `
    --address-prefix 10.0.0.0/16 `
    --subnet-name subnet-crm `
    --subnet-prefix 10.0.1.0/24 `
    --output table

# 3. Crear IP pública
Write-Host "`n🌍 [3/6] Creando IP pública..." -ForegroundColor Green
az network public-ip create `
    --resource-group $resourceGroup `
    --name ip-crm-ngso-prod `
    --sku Standard `
    --allocation-method Static `
    --output table

# 4. Crear grupo de seguridad de red (NSG) con reglas
Write-Host "`n🔒 [4/6] Creando grupo de seguridad de red..." -ForegroundColor Green
az network nsg create `
    --resource-group $resourceGroup `
    --name nsg-crm-ngso `
    --output table

# Agregar reglas de firewall
Write-Host "   ➕ Agregando regla SSH (22)..."
az network nsg rule create `
    --resource-group $resourceGroup `
    --nsg-name nsg-crm-ngso `
    --name AllowSSH `
    --priority 100 `
    --source-address-prefixes '*' `
    --destination-port-ranges 22 `
    --protocol Tcp `
    --access Allow `
    --output none

Write-Host "   ➕ Agregando regla HTTP (80)..."
az network nsg rule create `
    --resource-group $resourceGroup `
    --nsg-name nsg-crm-ngso `
    --name AllowHTTP `
    --priority 110 `
    --source-address-prefixes '*' `
    --destination-port-ranges 80 `
    --protocol Tcp `
    --access Allow `
    --output none

Write-Host "   ➕ Agregando regla HTTPS (443)..."
az network nsg rule create `
    --resource-group $resourceGroup `
    --nsg-name nsg-crm-ngso `
    --name AllowHTTPS `
    --priority 120 `
    --source-address-prefixes '*' `
    --destination-port-ranges 443 `
    --protocol Tcp `
    --access Allow `
    --output none

Write-Host "   ➕ Agregando regla API Backend (3000)..."
az network nsg rule create `
    --resource-group $resourceGroup `
    --nsg-name nsg-crm-ngso `
    --name AllowAPI `
    --priority 130 `
    --source-address-prefixes '*' `
    --destination-port-ranges 3000 `
    --protocol Tcp `
    --access Allow `
    --output none

# 5. Crear interfaz de red
Write-Host "`n🔌 [5/6] Creando interfaz de red..." -ForegroundColor Green
az network nic create `
    --resource-group $resourceGroup `
    --name nic-crm-ngso `
    --vnet-name vnet-crm-ngso `
    --subnet subnet-crm `
    --public-ip-address ip-crm-ngso-prod `
    --network-security-group nsg-crm-ngso `
    --output table

# 6. Crear máquina virtual
Write-Host "`n💻 [6/6] Creando máquina virtual..." -ForegroundColor Green
Write-Host "   ⏳ Esto puede tardar 2-3 minutos..." -ForegroundColor Yellow

az vm create `
    --resource-group $resourceGroup `
    --name $vmName `
    --location $location `
    --size $vmSize `
    --image $image `
    --admin-username $adminUser `
    --generate-ssh-keys `
    --nics nic-crm-ngso `
    --os-disk-size-gb 30 `
    --storage-sku Premium_LRS `
    --output json > vm-output.json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error creando máquina virtual" -ForegroundColor Red
    exit 1
}

# Leer información de la VM creada
$vmInfo = Get-Content vm-output.json | ConvertFrom-Json

Write-Host "`n✅ ¡Máquina virtual creada exitosamente!" -ForegroundColor Green

# Obtener IP pública
Write-Host "`n📡 Obteniendo IP pública..." -ForegroundColor Cyan
$publicIp = az network public-ip show `
    --resource-group $resourceGroup `
    --name ip-crm-ngso-prod `
    --query ipAddress `
    --output tsv

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  INFORMACION DE LA MAQUINA VIRTUAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nombre VM: " -NoNewline -ForegroundColor Yellow
Write-Host $vmName -ForegroundColor White
Write-Host "IP Publica: " -NoNewline -ForegroundColor Yellow
Write-Host $publicIp -ForegroundColor White
Write-Host "Usuario: " -NoNewline -ForegroundColor Yellow
Write-Host $adminUser -ForegroundColor White
Write-Host "Clave SSH: " -NoNewline -ForegroundColor Yellow
Write-Host "~/.ssh/id_rsa (generada automaticamente)" -ForegroundColor White
Write-Host "Region: " -NoNewline -ForegroundColor Yellow
Write-Host $location -ForegroundColor White
Write-Host "Tamano: " -NoNewline -ForegroundColor Yellow
Write-Host "$vmSize (2 vCPUs, 8GB RAM, 30GB SSD)" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "       CONECTARSE A LA VM" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ssh $adminUser@$publicIp" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "       PUERTOS ABIERTOS" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "   ✓ SSH (22)" -ForegroundColor Green
Write-Host "   ✓ HTTP (80)" -ForegroundColor Green
Write-Host "   ✓ HTTPS (443)" -ForegroundColor Green
Write-Host "   ✓ API Backend (3000)" -ForegroundColor Green
Write-Host ""

# Guardar información en archivo
$info = @"
=================================================
    CRM NGSO - INFORMACIÓN DE LA VM
=================================================

IP Pública: $publicIp
Usuario: $adminUser
Nombre VM: $vmName
Región: $location
Tamaño: $vmSize

CONECTARSE:
ssh $adminUser@$publicIp

PUERTOS ABIERTOS:
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 3000 (API Backend)

SIGUIENTE PASO:
1. Conectarse por SSH
2. Ejecutar: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
3. Seguir la guía: GUIA_DESPLIEGUE_AZURE.md (desde la PARTE 3)

=================================================
Creado: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
=================================================
"@

$info | Out-File -FilePath "vm-info.txt" -Encoding UTF8

Write-Host "Informacion guardada en: " -NoNewline -ForegroundColor Yellow
Write-Host "vm-info.txt" -ForegroundColor White
Write-Host ""
Write-Host "Listo! Ahora puedes conectarte por SSH y continuar con la instalacion." -ForegroundColor Green
Write-Host "Consulta la guia: GUIA_DESPLIEGUE_AZURE.md (desde PARTE 3)" -ForegroundColor Cyan
Write-Host ""

# Limpiar archivo temporal
Remove-Item vm-output.json -ErrorAction SilentlyContinue
