# =====================================================
# SCRIPT DE PRUEBAS - MÓDULO REPORTS
# NGS&O CRM Gestión - Desarrollado por AS Software
# =====================================================

$baseUrl = "http://localhost:3000/api/v1"
$Global:token = $null

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 PRUEBAS DEL MÓDULO REPORTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# =====================================================
# AUTENTICACIÓN
# =====================================================
Write-Host "Autenticando usuario..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "maria@crm.com"
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
# TEST 1: OBTENER MÉTRICAS DEL SISTEMA
# =====================================================
Write-Host "TEST 1: Obtener métricas del sistema" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/system" -Method Get -Headers $headers

    Write-Host "✅ Métricas del sistema obtenidas" -ForegroundColor Green
    Write-Host "   Tiempo de respuesta: $($response.metrics.averageResponseTime)ms" -ForegroundColor Gray
    Write-Host "   Chats activos: $($response.metrics.activeChats)" -ForegroundColor Gray
    Write-Host "   Agentes disponibles: $($response.metrics.availableAgents)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo métricas: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 2: OBTENER ESTADÍSTICAS DEL DASHBOARD
# =====================================================
Write-Host "`nTEST 2: Obtener estadísticas del dashboard" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/system/stats" -Method Get -Headers $headers

    Write-Host "✅ Estadísticas del dashboard obtenidas" -ForegroundColor Green
    Write-Host "   Total usuarios: $($response.data.users.total)" -ForegroundColor Gray
    Write-Host "   Usuarios activos: $($response.data.users.active)" -ForegroundColor Gray
    Write-Host "   Total chats: $($response.data.chats.total)" -ForegroundColor Gray
    Write-Host "   Chats activos: $($response.data.chats.active)" -ForegroundColor Gray
    Write-Host "   Total mensajes: $($response.data.messages.total)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estadísticas: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 3: OBTENER ESTADÍSTICAS DE AGENTE
# =====================================================
Write-Host "`nTEST 3: Obtener mis estadísticas como agente" -ForegroundColor Yellow
try {
    # Login como agente
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $agentResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $agentHeaders = @{ Authorization = "Bearer $($agentResponse.data.accessToken)" }

    $response = Invoke-RestMethod -Uri "$baseUrl/reports/agent/stats" -Method Get -Headers $agentHeaders

    Write-Host "✅ Estadísticas del agente obtenidas" -ForegroundColor Green
    Write-Host "   Chats asignados: $($response.data.chatsAssigned)" -ForegroundColor Gray
    Write-Host "   Chats activos: $($response.data.chatsActive)" -ForegroundColor Gray
    Write-Host "   Chats cerrados: $($response.data.chatsClosed)" -ForegroundColor Gray
    Write-Host "   Mensajes enviados: $($response.data.messagesSent)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estadísticas de agente: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 4: OBTENER ACTIVIDAD RECIENTE DEL AGENTE
# =====================================================
Write-Host "`nTEST 4: Obtener actividad reciente del agente" -ForegroundColor Yellow
try {
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $agentResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $agentHeaders = @{ Authorization = "Bearer $($agentResponse.data.accessToken)" }

    $response = Invoke-RestMethod -Uri "$baseUrl/reports/agent/activity" -Method Get -Headers $agentHeaders

    Write-Host "✅ Actividad reciente obtenida" -ForegroundColor Green
    Write-Host "   Eventos recientes: $($response.data.Length)" -ForegroundColor Gray
    
    if ($response.data.Length -gt 0) {
        Write-Host "   Últimas 3 actividades:" -ForegroundColor Gray
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "   - $($_.type): $($_.description)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error obteniendo actividad: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 5: REPORTES POR CAMPAÑA
# =====================================================
Write-Host "`nTEST 5: Obtener estadísticas por campaña" -ForegroundColor Yellow
try {
    $campaignId = "e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d"
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$campaignId/stats" -Method Get -Headers $headers

    Write-Host "✅ Estadísticas de campaña obtenidas" -ForegroundColor Green
    Write-Host "   Total chats: $($response.data.totalChats)" -ForegroundColor Gray
    Write-Host "   Chats activos: $($response.data.activeChats)" -ForegroundColor Gray
    Write-Host "   Tasa de conversión: $($response.data.conversionRate)%" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estadísticas de campaña: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 6: MÉTRICAS EN TIEMPO REAL
# =====================================================
Write-Host "`nTEST 6: Verificar métricas en tiempo real (múltiples llamadas)" -ForegroundColor Yellow
try {
    for ($i = 1; $i -le 3; $i++) {
        $response = Invoke-RestMethod -Uri "$baseUrl/reports/system" -Method Get -Headers $headers
        Write-Host "   Llamada $i - Chats activos: $($response.metrics.activeChats)" -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
    Write-Host "✅ Métricas en tiempo real funcionando" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en métricas en tiempo real: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 7: ESTADÍSTICAS DE USUARIOS
# =====================================================
Write-Host "`nTEST 7: Obtener estadísticas de usuarios" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/system/stats" -Method Get -Headers $headers

    Write-Host "✅ Estadísticas de usuarios obtenidas" -ForegroundColor Green
    Write-Host "   Total: $($response.data.users.total)" -ForegroundColor Gray
    Write-Host "   Activos: $($response.data.users.active)" -ForegroundColor Gray
    Write-Host "   Agentes: $($response.data.users.agents)" -ForegroundColor Gray
    Write-Host "   Supervisores: $($response.data.users.supervisors)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estadísticas de usuarios: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 8: ESTADÍSTICAS DE MENSAJES
# =====================================================
Write-Host "`nTEST 8: Obtener estadísticas de mensajes" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/system/stats" -Method Get -Headers $headers

    Write-Host "✅ Estadísticas de mensajes obtenidas" -ForegroundColor Green
    Write-Host "   Total mensajes: $($response.data.messages.total)" -ForegroundColor Gray
    Write-Host "   Mensajes hoy: $($response.data.messages.today)" -ForegroundColor Gray
    Write-Host "   Promedio por hora: $($response.data.messages.averagePerHour)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estadísticas de mensajes: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# RESUMEN
# =====================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ PRUEBAS DEL MÓDULO REPORTS COMPLETADAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
