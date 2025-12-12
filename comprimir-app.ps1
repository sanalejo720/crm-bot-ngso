# Script para comprimir la aplicación excluyendo archivos innecesarios

Write-Host "Comprimiendo aplicación..." -ForegroundColor Cyan

# Crear carpeta temporal
$tempDir = "temp-deploy"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copiar backend (excluyendo node_modules, dist, tokens, wpp-sessions)
Write-Host "Copiando backend..." -ForegroundColor Yellow
robocopy backend "$tempDir\backend" /E /XD node_modules dist tokens wpp-sessions backups uploads .tokens /XF *.log *.pma /NFL /NDL /NJH /NJS

# Copiar frontend (excluyendo node_modules, dist)
Write-Host "Copiando frontend..." -ForegroundColor Yellow
robocopy frontend "$tempDir\frontend" /E /XD node_modules dist /XF *.log /NFL /NDL /NJH /NJS

# Comprimir
Write-Host "Comprimiendo archivo..." -ForegroundColor Yellow
if (Test-Path "crm-app.zip") {
    Remove-Item "crm-app.zip" -Force
}
Compress-Archive -Path "$tempDir\*" -DestinationPath "crm-app.zip" -CompressionLevel Optimal

# Limpiar
Remove-Item $tempDir -Recurse -Force

$size = (Get-Item "crm-app.zip").Length / 1MB
Write-Host "`nArchivo crm-app.zip creado: $([math]::Round($size, 2)) MB" -ForegroundColor Green
Write-Host "`nAhora ejecuta: scp crm-app.zip azureuser@172.203.16.202:~/" -ForegroundColor Cyan
