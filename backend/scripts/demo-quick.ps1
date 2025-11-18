# =====================================================
# SCRIPT DE DEMO RÁPIDA - TESTING
# NGS&O CRM Gestión - Desarrollado por AS Software
# =====================================================

$baseUrl = "http://localhost:3000/api/v1"

Write-Host "`n"
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "║         NGS&O CRM - DEMO DE TESTING                ║" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar backend
Write-Host "🔍 Verificando disponibilidad del backend..." -ForegroundColor Yellow
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body '{"email":"test","password":"test"}' -ErrorAction SilentlyContinue
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Backend disponible`n" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend NO disponible. Iniciando backend..." -ForegroundColor Red
        Write-Host "   Ejecuta: cd backend && npm run start:dev`n" -ForegroundColor Yellow
        exit 1
    }
}

Start-Sleep -Seconds 1

# Demo 1: Login
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  DEMO 1: Autenticación" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Magenta

Write-Host "Intentando login con juan@crm.com..." -ForegroundColor White
$loginData = @{
    email = "juan@crm.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $token = $response.data.accessToken
    $user = $response.data.user

    Write-Host "✅ Login exitoso!" -ForegroundColor Green
    Write-Host "   Usuario: $($user.firstName) $($user.lastName)" -ForegroundColor Gray
    Write-Host "   Rol: $($user.role.name)" -ForegroundColor Gray
    Write-Host "   Email: $($user.email)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en login" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

# Demo 2: Obtener Chats
Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  DEMO 2: Obtener Chats del Agente" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Magenta

$headers = @{ Authorization = "Bearer $token" }

Write-Host "Obteniendo chats asignados..." -ForegroundColor White
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chats/my-chats" -Method Get -Headers $headers

    Write-Host "✅ Chats obtenidos: $($response.data.Length) chats" -ForegroundColor Green
    
    if ($response.data.Length -gt 0) {
        Write-Host "`n   Primeros 3 chats:" -ForegroundColor Cyan
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "   📱 $($_.contactName) - $($_.contactPhone)" -ForegroundColor White
            Write-Host "      Estado: $($_.status) | Campaña: $($_.campaign.name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   No hay chats asignados actualmente" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error obteniendo chats" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Demo 3: Crear Chat Nuevo
Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  DEMO 3: Crear Chat Nuevo" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Magenta

$contactName = "Cliente Demo $(Get-Random -Maximum 999)"
$contactPhone = "+521$(Get-Random -Minimum 1000000000 -Maximum 9999999999)"

Write-Host "Creando chat para $contactName..." -ForegroundColor White

$chatData = @{
    campaignId = "e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d"
    whatsappNumberId = "a2c91e8b-1f8d-4e77-8d8c-ec9e4e5d6d4f"
    contactPhone = $contactPhone
    contactName = $contactName
    initialMessage = "¡Hola! Esta es una prueba del sistema"
    channel = "whatsapp"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $chatData

    $chatId = $response.data.id

    Write-Host "✅ Chat creado exitosamente!" -ForegroundColor Green
    Write-Host "   Chat ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Contacto: $($response.data.contactName)" -ForegroundColor Gray
    Write-Host "   Teléfono: $($response.data.contactPhone)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error creando chat" -ForegroundColor Red
    $chatId = $null
}

Start-Sleep -Seconds 2

# Demo 4: Enviar Mensaje
if ($chatId) {
    Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  DEMO 4: Enviar Mensaje" -ForegroundColor Magenta
    Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Magenta

    Write-Host "Enviando mensaje al chat..." -ForegroundColor White

    $messageData = @{
        chatId = $chatId
        content = "¡Hola $contactName! Bienvenido a NGS`&O. ¿En qué puedo ayudarte? 😊"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post `
            -ContentType "application/json" -Headers $headers -Body $messageData

        Write-Host "✅ Mensaje enviado!" -ForegroundColor Green
        Write-Host "   Contenido: $($response.data.content)" -ForegroundColor Gray
        Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error enviando mensaje" -ForegroundColor Red
    }

    Start-Sleep -Seconds 2
}

# Demo 5: Estadísticas
Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  DEMO 5: Estadísticas del Agente" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Magenta

Write-Host "Obteniendo estadísticas..." -ForegroundColor White

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/agent/stats" -Method Get -Headers $headers

    Write-Host "✅ Estadísticas obtenidas!" -ForegroundColor Green
    Write-Host "`n   📊 RESUMEN:" -ForegroundColor Cyan
    Write-Host "   ─────────────────" -ForegroundColor Cyan
    Write-Host "   Chats Asignados:  $($response.data.chatsAssigned)" -ForegroundColor White
    Write-Host "   Chats Activos:    $($response.data.chatsActive)" -ForegroundColor White
    Write-Host "   Chats Cerrados:   $($response.data.chatsClosed)" -ForegroundColor White
    Write-Host "   Mensajes Enviados: $($response.data.messagesSent)" -ForegroundColor White
} catch {
    Write-Host "❌ Error obteniendo estadísticas" -ForegroundColor Red
}

# Resumen Final
Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "║              DEMO COMPLETADA                       ║" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📝 Scripts disponibles:" -ForegroundColor White
Write-Host "   - test-all.ps1          : Suite completa de pruebas" -ForegroundColor Yellow
Write-Host "   - test-flow-complete.ps1: Flujo completo de atención" -ForegroundColor Yellow
Write-Host "   - test-auth.ps1         : Solo autenticación" -ForegroundColor Yellow
Write-Host "   - test-chats.ps1        : Solo chats" -ForegroundColor Yellow
Write-Host "   - test-messages.ps1     : Solo mensajes" -ForegroundColor Yellow

Write-Host "`n📚 Documentación completa en:" -ForegroundColor White
Write-Host "   - backend/scripts/README.md" -ForegroundColor Gray
Write-Host "   - TESTING_GUIDE.md" -ForegroundColor Gray

Write-Host "`n✨ ¡Prueba los scripts para ver el sistema en acción!" -ForegroundColor Green
Write-Host ""
