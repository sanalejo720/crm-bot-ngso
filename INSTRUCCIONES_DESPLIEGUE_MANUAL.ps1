# ⚡ DESPLIEGUE MANUAL SIMPLIFICADO
# Ejecutar cada comando manualmente en PowerShell

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " INSTRUCCIONES DE DESPLIEGUE MANUAL " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ COPIAR ARCHIVO CRÍTICO (wppconnect.service.ts)" -ForegroundColor Yellow
Write-Host "Este archivo corrige el error 'No LID for user'" -ForegroundColor Gray
Write-Host ""
Write-Host 'ssh root@72.61.73.9 "cat > /var/www/crm-ngso-whatsapp/backend/src/modules/whatsapp/providers/wppconnect.service.ts" < backend\src\modules\whatsapp\providers\wppconnect.service.ts' -ForegroundColor Green
Write-Host ""

Write-Host "2️⃣ APLICAR MIGRACIÓN SQL" -ForegroundColor Yellow
Write-Host "Crear tabla agent_sessions" -ForegroundColor Gray
Write-Host ""
Write-Host 'ssh root@72.61.73.9' -ForegroundColor Green
Write-Host 'cd /var/www/crm-ngso-whatsapp' -ForegroundColor Green
Write-Host 'psql -U postgres -d crm_ngso -f create_agent_sessions_table.sql' -ForegroundColor Green
Write-Host 'exit' -ForegroundColor Green
Write-Host ""

Write-Host "3️⃣ COMPILAR Y REINICIAR" -ForegroundColor Yellow
Write-Host 'ssh root@72.61.73.9' -ForegroundColor Green
Write-Host 'cd /var/www/crm-ngso-whatsapp/backend' -ForegroundColor Green
Write-Host 'npm run build' -ForegroundColor Green
Write-Host 'pm2 restart crm-backend' -ForegroundColor Green
Write-Host 'pm2 logs crm-backend --lines 50' -ForegroundColor Green
Write-Host 'exit' -ForegroundColor Green
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " ALTERNATIVA: COPIAR VÍA CAT/PIPE   " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Si el método anterior no funciona, conectar y pegar manualmente:" -ForegroundColor Yellow
Write-Host ""
Write-Host '1. ssh root@72.61.73.9' -ForegroundColor Green
Write-Host '2. nano /var/www/crm-ngso-whatsapp/backend/src/modules/whatsapp/providers/wppconnect.service.ts' -ForegroundColor Green
Write-Host '3. Buscar el método sendTextMessage (línea ~518)' -ForegroundColor Gray
Write-Host '4. Reemplazar con el código corregido del archivo local' -ForegroundColor Gray
Write-Host '5. Ctrl+X, Y, Enter para guardar' -ForegroundColor Gray
Write-Host ""

Write-Host "=====================================" -ForegroundColor Green
Write-Host "CAMBIOS MÁS IMPORTANTES:" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "✅ Corregido error 'No LID for user'" -ForegroundColor White
Write-Host "✅ Obtiene WID correcto antes de enviar" -ForegroundColor White
Write-Host "✅ Maneja @lid y @c.us automáticamente" -ForegroundColor White
Write-Host ""
