# Test Completo con Diferentes Usuarios - CRM NGS&O

$baseUrl = "http://localhost:3000/api/v1"
$testsPassed = 0
$testsFailed = 0

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS POR ROL DE USUARIO" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# ============= TESTS COMO AGENTE =============
Write-Host "--- TESTS COMO AGENTE (juan@crm.com) ---" -ForegroundColor Yellow
Write-Host ""

# Login como agente
try {
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $agenteToken = $response.data.accessToken
    
    Write-Host "[OK] Login como agente exitoso" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "[ERROR] Login como agente fallido" -ForegroundColor Red
    $testsFailed++
    exit 1
}

# Test: Mis chats (agente)
try {
    $headers = @{ Authorization = "Bearer $agenteToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/chats/my-chats" -Method Get -Headers $headers
    
    Write-Host "[OK] Chats del agente: $($response.data.Length) chats" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "[ERROR] No se pudieron obtener chats del agente" -ForegroundColor Red
    $testsFailed++
}

# Test: Estadisticas (agente)
try {
    $headers = @{ Authorization = "Bearer $agenteToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/agent/stats" -Method Get -Headers $headers
    
    Write-Host "[OK] Estadisticas del agente: $($response.data.chatsAssigned) chats asignados" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "[ERROR] No se pudieron obtener estadisticas del agente" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# ============= TESTS COMO ADMIN =============
Write-Host "--- TESTS COMO ADMIN (admin@crm.com) ---" -ForegroundColor Yellow
Write-Host ""

# Login como admin
try {
    $loginData = @{
        email = "admin@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $adminToken = $response.data.accessToken
    
    Write-Host "[OK] Login como admin exitoso" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "[ERROR] Login como admin fallido" -ForegroundColor Red
    $testsFailed++
}

# Test: Listar todos los chats (admin)
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Get -Headers $headers
    
    Write-Host "[OK] Todos los chats: $($response.data.Length) chats" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "[ERROR] No se pudieron obtener todos los chats" -ForegroundColor Red
    $testsFailed++
}

# Test: Listar campanas (admin)
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns" -Method Get -Headers $headers
    
    Write-Host "[OK] Campanas: $($response.data.Length) campanas" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "[ERROR] No se pudieron obtener campanas" -ForegroundColor Red
    $testsFailed++
}

# Test: Listar usuarios (admin)
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
    
    Write-Host "[OK] Usuarios: $($response.data.Length) usuarios" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "[ERROR] No se pudieron obtener usuarios" -ForegroundColor Red
    $testsFailed++
}

# Test: Metricas del sistema (admin)
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/system" -Method Get -Headers $headers
    
    Write-Host "[OK] Metricas del sistema obtenidas" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "[ERROR] No se pudieron obtener metricas del sistema" -ForegroundColor Red
    $testsFailed++
}

# Test: Crear nuevo chat (admin)
Write-Host ""
Write-Host "--- TEST DE CREACION ---" -ForegroundColor Yellow
Write-Host ""

$contactName = "Cliente Test $(Get-Random -Maximum 999)"
$contactPhone = "+521$(Get-Random -Minimum 5500000000 -Maximum 5599999999)"

try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $chatData = @{
        campaignId = "e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d"
        whatsappNumberId = "a2c91e8b-1f8d-4e77-8d8c-ec9e4e5d6d4f"
        contactPhone = $contactPhone
        contactName = $contactName
        initialMessage = "Hola, esta es una prueba"
        channel = "whatsapp"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Post -ContentType "application/json" -Headers $headers -Body $chatData
    $newChatId = $response.data.id
    
    Write-Host "[OK] Chat creado: $contactName ($contactPhone)" -ForegroundColor Green
    Write-Host "     Chat ID: $newChatId" -ForegroundColor Gray
    $testsPassed++
    
    # Test: Enviar mensaje al nuevo chat
    try {
        $messageData = @{
            chatId = $newChatId
            content = "Hola! Este es un mensaje de prueba automatica"
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post -ContentType "application/json" -Headers $headers -Body $messageData
        
        Write-Host "[OK] Mensaje enviado al nuevo chat" -ForegroundColor Green
        $testsPassed++
    } catch {
        Write-Host "[ERROR] No se pudo enviar mensaje" -ForegroundColor Red
        $testsFailed++
    }
    
} catch {
    Write-Host "[ERROR] No se pudo crear chat" -ForegroundColor Red
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Resumen final
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total de tests:    $($testsPassed + $testsFailed)" -ForegroundColor White
Write-Host "Tests exitosos:    $testsPassed" -ForegroundColor Green
Write-Host "Tests fallidos:    $testsFailed" -ForegroundColor Red
Write-Host ""

$percentage = [math]::Round(($testsPassed / ($testsPassed + $testsFailed)) * 100, 2)
Write-Host "Tasa de exito:     $percentage%" -ForegroundColor $(if ($percentage -ge 80) { "Green" } else { "Yellow" })
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "TODOS LOS TESTS PASARON!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Algunos tests fallaron, revisar permisos y configuracion" -ForegroundColor Yellow
    exit 1
}
