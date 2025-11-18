# =====================================================
# SCRIPT DE PRUEBAS - MÓDULO CHATS
# NGS&O CRM Gestión - Desarrollado por AS Software
# =====================================================

$baseUrl = "http://localhost:3000/api/v1"
$Global:token = $null
$Global:chatId = $null
$Global:campaignId = "e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d" # Cobranzas
$Global:whatsappNumberId = "a2c91e8b-1f8d-4e77-8d8c-ec9e4e5d6d4f"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "💬 PRUEBAS DEL MÓDULO CHATS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# =====================================================
# AUTENTICACIÓN PREVIA
# =====================================================
Write-Host "Autenticando usuario..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $Global:token = $response.data.accessToken
    Write-Host "✅ Autenticación exitosa`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en autenticación: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $Global:token" }

# =====================================================
# TEST 1: CREAR NUEVO CHAT
# =====================================================
Write-Host "TEST 1: Crear nuevo chat" -ForegroundColor Yellow
try {
    $chatData = @{
        campaignId = $Global:campaignId
        whatsappNumberId = $Global:whatsappNumberId
        contactPhone = "+521$(Get-Random -Minimum 1000000000 -Maximum 9999999999)"
        contactName = "Cliente Prueba $(Get-Random -Maximum 999)"
        initialMessage = "Hola, necesito información sobre mi cuenta"
        channel = "whatsapp"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $chatData

    $Global:chatId = $response.data.id

    Write-Host "✅ Chat creado exitosamente" -ForegroundColor Green
    Write-Host "   Chat ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Contacto: $($response.data.contactName)" -ForegroundColor Gray
    Write-Host "   Teléfono: $($response.data.contactPhone)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
    Write-Host "   Agente asignado: $(if($response.data.assignedAgentId) { $response.data.assignedAgentId } else { 'Sin asignar' })" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error creando chat: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# TEST 2: OBTENER TODOS LOS CHATS
# =====================================================
Write-Host "`nTEST 2: Obtener todos los chats" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Get -Headers $headers

    Write-Host "✅ Chats obtenidos exitosamente" -ForegroundColor Green
    Write-Host "   Total de chats: $($response.data.Length)" -ForegroundColor Gray
    
    if ($response.data.Length -gt 0) {
        Write-Host "   Primeros 3 chats:" -ForegroundColor Gray
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "   - $($_.contactName) ($($_.status))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error obteniendo chats: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 3: OBTENER MIS CHATS (AGENTE)
# =====================================================
Write-Host "`nTEST 3: Obtener mis chats asignados" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chats/my-chats" -Method Get -Headers $headers

    Write-Host "✅ Mis chats obtenidos exitosamente" -ForegroundColor Green
    Write-Host "   Chats asignados a mí: $($response.data.Length)" -ForegroundColor Gray
    
    if ($response.data.Length -gt 0) {
        Write-Host "   Mis chats:" -ForegroundColor Gray
        $response.data | ForEach-Object {
            Write-Host "   - $($_.contactName) ($($_.status))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error obteniendo mis chats: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 4: OBTENER CHAT POR ID
# =====================================================
Write-Host "`nTEST 4: Obtener chat por ID" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chats/$Global:chatId" -Method Get -Headers $headers

    Write-Host "✅ Chat obtenido exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Contacto: $($response.data.contactName)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
    Write-Host "   Campaña: $($response.data.campaign.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo chat: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 5: OBTENER CHATS EN COLA (WAITING)
# =====================================================
Write-Host "`nTEST 5: Obtener chats en cola" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chats/waiting/$Global:campaignId" -Method Get -Headers $headers

    Write-Host "✅ Chats en cola obtenidos exitosamente" -ForegroundColor Green
    Write-Host "   Chats esperando: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo chats en cola: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 6: ASIGNAR CHAT A AGENTE
# =====================================================
Write-Host "`nTEST 6: Asignar chat a agente" -ForegroundColor Yellow
try {
    # Login como supervisor para poder asignar
    $loginData = @{
        email = "maria@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $supervResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $supervHeaders = @{ Authorization = "Bearer $($supervResponse.data.accessToken)" }
    
    $assignData = @{
        agentId = "5af97a2a-a9a4-47ea-8d08-b8ff2facc06c" # Juan Pérez
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats/$Global:chatId/assign" -Method Patch `
        -ContentType "application/json" -Headers $supervHeaders -Body $assignData

    Write-Host "✅ Chat asignado exitosamente" -ForegroundColor Green
    Write-Host "   Chat ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Asignado a: $($response.data.assignedAgent.firstName) $($response.data.assignedAgent.lastName)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error asignando chat: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 7: ACTUALIZAR ESTADO DEL CHAT
# =====================================================
Write-Host "`nTEST 7: Actualizar estado del chat" -ForegroundColor Yellow
try {
    $statusData = @{
        status = "active"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats/$Global:chatId/status" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $statusData

    Write-Host "✅ Estado del chat actualizado" -ForegroundColor Green
    Write-Host "   Nuevo estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error actualizando estado: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 8: OBTENER CHATS CON FILTROS
# =====================================================
Write-Host "`nTEST 8: Filtrar chats por estado" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chats?status=active" -Method Get -Headers $headers

    Write-Host "✅ Chats filtrados exitosamente" -ForegroundColor Green
    Write-Host "   Chats activos: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error filtrando chats: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 9: FILTRAR CHATS POR CAMPAÑA
# =====================================================
Write-Host "`nTEST 9: Filtrar chats por campaña" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chats?campaignId=$Global:campaignId" -Method Get -Headers $headers

    Write-Host "✅ Chats filtrados por campaña" -ForegroundColor Green
    Write-Host "   Chats de la campaña: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error filtrando por campaña: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 10: CERRAR CHAT
# =====================================================
Write-Host "`nTEST 10: Cerrar chat" -ForegroundColor Yellow
try {
    $closeData = @{
        status = "closed"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats/$Global:chatId/status" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $closeData

    Write-Host "✅ Chat cerrado exitosamente" -ForegroundColor Green
    Write-Host "   Estado final: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error cerrando chat: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# RESUMEN
# =====================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ PRUEBAS DEL MÓDULO CHATS COMPLETADAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
