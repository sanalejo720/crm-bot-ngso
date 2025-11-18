# =====================================================
# SCRIPT DE PRUEBAS - MÓDULO CAMPAIGNS
# NGS&O CRM Gestión - Desarrollado por AS Software
# =====================================================

$baseUrl = "http://localhost:3000/api/v1"
$Global:token = $null
$Global:campaignId = $null

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📢 PRUEBAS DEL MÓDULO CAMPAIGNS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# =====================================================
# AUTENTICACIÓN
# =====================================================
Write-Host "Autenticando como administrador..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "admin@crm.com"
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
# TEST 1: CREAR NUEVA CAMPAÑA
# =====================================================
Write-Host "TEST 1: Crear nueva campaña" -ForegroundColor Yellow
try {
    $campaignData = @{
        name = "Campaña Prueba $(Get-Random -Maximum 9999)"
        description = "Campaña de prueba automatizada"
        type = "collection"
        status = "draft"
        settings = @{
            autoAssign = $true
            maxChatsPerAgent = 5
            priority = "medium"
        }
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $campaignData

    $Global:campaignId = $response.data.id

    Write-Host "✅ Campaña creada exitosamente" -ForegroundColor Green
    Write-Host "   Campaign ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Nombre: $($response.data.name)" -ForegroundColor Gray
    Write-Host "   Tipo: $($response.data.type)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error creando campaña: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 2: OBTENER TODAS LAS CAMPAÑAS
# =====================================================
Write-Host "`nTEST 2: Obtener todas las campañas" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns" -Method Get -Headers $headers

    Write-Host "✅ Campañas obtenidas exitosamente" -ForegroundColor Green
    Write-Host "   Total de campañas: $($response.data.Length)" -ForegroundColor Gray
    
    if ($response.data.Length -gt 0) {
        Write-Host "   Campañas existentes:" -ForegroundColor Gray
        $response.data | ForEach-Object {
            Write-Host "   - $($_.name) ($($_.status))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error obteniendo campañas: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 3: OBTENER CAMPAÑAS ACTIVAS
# =====================================================
Write-Host "`nTEST 3: Obtener campañas activas" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/active" -Method Get -Headers $headers

    Write-Host "✅ Campañas activas obtenidas" -ForegroundColor Green
    Write-Host "   Campañas activas: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo campañas activas: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 4: OBTENER CAMPAÑA POR ID
# =====================================================
Write-Host "`nTEST 4: Obtener campaña por ID" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$Global:campaignId" -Method Get -Headers $headers

    Write-Host "✅ Campaña obtenida exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Nombre: $($response.data.name)" -ForegroundColor Gray
    Write-Host "   Descripción: $($response.data.description)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo campaña: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 5: ACTUALIZAR CAMPAÑA
# =====================================================
Write-Host "`nTEST 5: Actualizar campaña" -ForegroundColor Yellow
try {
    $updateData = @{
        name = "Campaña Actualizada $(Get-Random -Maximum 999)"
        description = "Descripción actualizada"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$Global:campaignId" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $updateData

    Write-Host "✅ Campaña actualizada exitosamente" -ForegroundColor Green
    Write-Host "   Nuevo nombre: $($response.data.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error actualizando campaña: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 6: ACTUALIZAR ESTADO DE CAMPAÑA
# =====================================================
Write-Host "`nTEST 6: Actualizar estado de campaña" -ForegroundColor Yellow
try {
    $statusData = @{
        status = "active"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$Global:campaignId/status" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $statusData

    Write-Host "✅ Estado actualizado exitosamente" -ForegroundColor Green
    Write-Host "   Nuevo estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error actualizando estado: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 7: ACTUALIZAR SETTINGS DE CAMPAÑA
# =====================================================
Write-Host "`nTEST 7: Actualizar settings de campaña" -ForegroundColor Yellow
try {
    $settingsData = @{
        settings = @{
            autoAssign = $false
            maxChatsPerAgent = 10
            priority = "high"
            enableBot = $true
        }
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$Global:campaignId/settings" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $settingsData

    Write-Host "✅ Settings actualizados exitosamente" -ForegroundColor Green
    Write-Host "   Auto-asignación: $($response.data.settings.autoAssign)" -ForegroundColor Gray
    Write-Host "   Max chats: $($response.data.settings.maxChatsPerAgent)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error actualizando settings: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 8: OBTENER ESTADÍSTICAS DE CAMPAÑA
# =====================================================
Write-Host "`nTEST 8: Obtener estadísticas de campaña" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$Global:campaignId/stats" -Method Get -Headers $headers

    Write-Host "✅ Estadísticas obtenidas exitosamente" -ForegroundColor Green
    Write-Host "   Total de chats: $($response.data.totalChats)" -ForegroundColor Gray
    Write-Host "   Chats activos: $($response.data.activeChats)" -ForegroundColor Gray
    Write-Host "   Chats cerrados: $($response.data.closedChats)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estadísticas: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 9: ACTIVAR CAMPAÑA
# =====================================================
Write-Host "`nTEST 9: Activar campaña" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$Global:campaignId/activate" -Method Post `
        -Headers $headers

    Write-Host "✅ Campaña activada exitosamente" -ForegroundColor Green
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error activando campaña: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 10: PAUSAR CAMPAÑA
# =====================================================
Write-Host "`nTEST 10: Pausar campaña" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$Global:campaignId/pause" -Method Post `
        -Headers $headers

    Write-Host "✅ Campaña pausada exitosamente" -ForegroundColor Green
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error pausando campaña: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 11: FILTRAR CAMPAÑAS POR ESTADO
# =====================================================
Write-Host "`nTEST 11: Filtrar campañas por estado" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns?status=active" -Method Get -Headers $headers

    Write-Host "✅ Filtro aplicado exitosamente" -ForegroundColor Green
    Write-Host "   Campañas activas encontradas: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error filtrando campañas: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 12: BUSCAR CAMPAÑAS POR NOMBRE
# =====================================================
Write-Host "`nTEST 12: Buscar campañas por nombre" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns?search=Cobranza" -Method Get -Headers $headers

    Write-Host "✅ Búsqueda completada" -ForegroundColor Green
    Write-Host "   Resultados encontrados: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en búsqueda: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 13: OBTENER NÚMEROS WHATSAPP DE CAMPAÑA
# =====================================================
Write-Host "`nTEST 13: Obtener números WhatsApp de campaña" -ForegroundColor Yellow
try {
    $cobranzasId = "e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d"
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$cobranzasId/whatsapp-numbers" -Method Get -Headers $headers

    Write-Host "✅ Números WhatsApp obtenidos" -ForegroundColor Green
    Write-Host "   Números asignados: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo números: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# RESUMEN
# =====================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ PRUEBAS DEL MÓDULO CAMPAIGNS COMPLETADAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
