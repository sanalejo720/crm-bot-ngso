# Script de despliegue en Azure
# IP: 172.203.16.202

Write-Host "=== DESPLIEGUE EN AZURE ===" -ForegroundColor Cyan
Write-Host ""

# Credenciales del servidor
$serverIP = "172.203.16.202"
$serverUser = "azureuser"  # Ajusta según tu configuración

Write-Host "Servidor: $serverIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "PASOS A SEGUIR:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Conectar al servidor via SSH:" -ForegroundColor White
Write-Host "   ssh $serverUser@$serverIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Navegar al directorio del proyecto:" -ForegroundColor White
Write-Host "   cd /home/azureuser/crm-ngso-whatsapp" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Hacer backup del código actual:" -ForegroundColor White
Write-Host "   cp -r backend backend-backup-`$(date +%Y%m%d-%H%M%S)" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Obtener los cambios del repositorio:" -ForegroundColor White
Write-Host "   git fetch origin" -ForegroundColor Cyan
Write-Host "   git checkout feature/mejoras-crm-bot" -ForegroundColor Cyan
Write-Host "   git pull origin feature/mejoras-crm-bot" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Instalar dependencias (si es necesario):" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   npm install" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Compilar el backend:" -ForegroundColor White
Write-Host "   npm run build" -ForegroundColor Cyan
Write-Host ""
Write-Host "7. Listar procesos PM2:" -ForegroundColor White
Write-Host "   pm2 list" -ForegroundColor Cyan
Write-Host ""
Write-Host "8. Reiniciar el backend:" -ForegroundColor White
Write-Host "   pm2 restart crm-backend" -ForegroundColor Cyan
Write-Host "   # O si el proceso tiene otro nombre:" -ForegroundColor Gray
Write-Host "   pm2 restart all" -ForegroundColor Cyan
Write-Host ""
Write-Host "9. Verificar logs:" -ForegroundColor White
Write-Host "   pm2 logs crm-backend --lines 50" -ForegroundColor Cyan
Write-Host ""
Write-Host "10. Verificar que el servidor responde:" -ForegroundColor White
Write-Host "    curl http://localhost:3000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "=== COMANDOS ÚTILES ===" -ForegroundColor Magenta
Write-Host ""
Write-Host "Ver estado de PM2:" -ForegroundColor White
Write-Host "  pm2 status" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ver logs en tiempo real:" -ForegroundColor White
Write-Host "  pm2 logs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitorear recursos:" -ForegroundColor White
Write-Host "  pm2 monit" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si hay errores, rollback:" -ForegroundColor White
Write-Host "  cd /home/azureuser/crm-ngso-whatsapp" -ForegroundColor Cyan
Write-Host "  rm -rf backend" -ForegroundColor Cyan
Write-Host "  cp -r backend-backup-XXXXXX backend" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor Cyan
Write-Host "  pm2 restart all" -ForegroundColor Cyan
Write-Host ""
Write-Host "=== CAMBIOS INCLUIDOS ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "✓ Normalización de teléfonos en bot-engine.service.ts" -ForegroundColor Green
Write-Host "✓ Normalización de teléfonos en bot-listener.service.ts" -ForegroundColor Green
Write-Host "✓ Corrección de variables literales {{debtor.fullName}}" -ForegroundColor Green
Write-Host "✓ Mejoras en debtors.controller.ts y debtors.service.ts" -ForegroundColor Green
Write-Host ""
Write-Host "PRESIONA ENTER para iniciar conexión SSH..." -ForegroundColor Cyan
Read-Host

# Intentar conectar via SSH
ssh $serverUser@$serverIP
