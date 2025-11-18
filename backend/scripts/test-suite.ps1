# Test Suite Completo - CRM NGS&O
# Ejecuta pruebas de todos los modulos principales

$baseUrl = "http://localhost:3000/api/v1"
$Global:PassedTests = 0
$Global:FailedTests = 0

function Write-TestResult {
    param($Name, $Success, $Details = "")
    
    if ($Success) {
        Write-Host "[OK] $Name" -ForegroundColor Green
        if ($Details) { Write-Host "     $Details" -ForegroundColor Gray }
        $Global:PassedTests++
    } else {
        Write-Host "[FAIL] $Name" -ForegroundColor Red
        if ($Details) { Write-Host "     $Details" -ForegroundColor Gray }
        $Global:FailedTests++
    }
}

function Write-Module {
    param($Name)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $Name" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

# MODULO 1: AUTENTICACION
Write-Module "MODULO 1: AUTENTICACION"

# Test 1.1: Login Admin
try {
    $loginData = @{
        email = "admin@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $adminToken = $response.data.accessToken
    Write-TestResult "Login Admin" $true "Token obtenido"
} catch {
    Write-TestResult "Login Admin" $false
    exit 1
}

# Test 1.2: Login Agente
try {
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $agenteToken = $response.data.accessToken
    $agenteId = $response.data.user.id
    Write-TestResult "Login Agente" $true "Usuario: $($response.data.user.email)"
} catch {
    Write-TestResult "Login Agente" $false
}

# Test 1.3: Obtener perfil
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers
    Write-TestResult "Obtener Perfil" $true "Rol: $($response.data.role)"
} catch {
    Write-TestResult "Obtener Perfil" $false
}

Start-Sleep -Milliseconds 300

# MODULO 2: USUARIOS
Write-Module "MODULO 2: USUARIOS"

# Test 2.1: Listar usuarios
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
    Write-TestResult "Listar Usuarios" $true "$($response.data.Length) usuarios encontrados"
} catch {
    Write-TestResult "Listar Usuarios" $false
}

# Test 2.2: Obtener agentes disponibles
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/users/available-agents" -Method Get -Headers $headers
    Write-TestResult "Agentes Disponibles" $true "$($response.data.Length) agentes"
} catch {
    Write-TestResult "Agentes Disponibles" $false
}

Start-Sleep -Milliseconds 300

# MODULO 3: CAMPANAS
Write-Module "MODULO 3: CAMPANAS"

# Test 3.1: Listar campanas
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns" -Method Get -Headers $headers
    $campaignId = $response.data[0].id
    Write-TestResult "Listar Campanas" $true "$($response.data.Length) campanas, usando: $($response.data[0].name)"
} catch {
    Write-TestResult "Listar Campanas" $false
}

# Test 3.2: Obtener campana especifica
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns/$campaignId" -Method Get -Headers $headers
    Write-TestResult "Obtener Campana" $true "ID: $($response.data.id)"
} catch {
    Write-TestResult "Obtener Campana" $false
}

Start-Sleep -Milliseconds 300

# MODULO 4: CHATS
Write-Module "MODULO 4: CHATS"

# Test 4.1: Listar todos los chats (admin)
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Get -Headers $headers
    Write-TestResult "Listar Todos los Chats" $true "$($response.data.Length) chats totales"
} catch {
    Write-TestResult "Listar Todos los Chats" $false
}

# Test 4.2: Listar chats del agente
try {
    $headers = @{ Authorization = "Bearer $agenteToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/chats/my-chats" -Method Get -Headers $headers
    Write-TestResult "Mis Chats (Agente)" $true "$($response.data.Length) chats asignados"
} catch {
    Write-TestResult "Mis Chats (Agente)" $false
}

# Test 4.3: Crear nuevo chat
$testContactName = "Test Auto $(Get-Random -Maximum 9999)"
$testContactPhone = "+521$(Get-Random -Minimum 5500000000 -Maximum 5599999999)"
$testExternalId = "test_$(Get-Random -Maximum 999999)"

try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $chatData = @{
        campaignId = $campaignId
        whatsappNumberId = "a2d0767b-248a-4cf7-845f-46efd5cc891f"
        contactPhone = $testContactPhone
        contactName = $testContactName
        externalId = $testExternalId
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Post -ContentType "application/json" -Headers $headers -Body $chatData
    $newChatId = $response.data.id
    Write-TestResult "Crear Chat" $true "Chat creado: $testContactName"
} catch {
    Write-TestResult "Crear Chat" $false $_.Exception.Message
    $newChatId = $null
}

# Test 4.4: Obtener chat por ID
if ($newChatId) {
    try {
        $headers = @{ Authorization = "Bearer $adminToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/chats/$newChatId" -Method Get -Headers $headers
        Write-TestResult "Obtener Chat por ID" $true "Estado: $($response.data.status)"
    } catch {
        Write-TestResult "Obtener Chat por ID" $false
    }
}

Start-Sleep -Milliseconds 300

# MODULO 5: MENSAJES
Write-Module "MODULO 5: MENSAJES"

# Test 5.1: Enviar mensaje (si tenemos un chat)
if ($newChatId) {
    try {
        $headers = @{ Authorization = "Bearer $adminToken" }
        $messageData = @{
            chatId = $newChatId
            content = "Mensaje de prueba automatica - Test Suite"
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post -ContentType "application/json" -Headers $headers -Body $messageData
        $messageId = $response.data.id
        Write-TestResult "Enviar Mensaje" $true "Mensaje ID: $messageId"
    } catch {
        Write-TestResult "Enviar Mensaje" $false
        $messageId = $null
    }

    # Test 5.2: Obtener historial del chat
    try {
        $headers = @{ Authorization = "Bearer $adminToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/messages/chat/$newChatId" -Method Get -Headers $headers
        Write-TestResult "Obtener Historial" $true "$($response.data.Length) mensajes en el chat"
    } catch {
        Write-TestResult "Obtener Historial" $false
    }

    # Test 5.3: Obtener mensaje especifico
    if ($messageId) {
        try {
            $headers = @{ Authorization = "Bearer $adminToken" }
            $response = Invoke-RestMethod -Uri "$baseUrl/messages/$messageId" -Method Get -Headers $headers
            Write-TestResult "Obtener Mensaje Especifico" $true "Estado: $($response.data.status)"
        } catch {
            Write-TestResult "Obtener Mensaje Especifico" $false
        }
    }
}

Start-Sleep -Milliseconds 300

# MODULO 6: REPORTES Y ESTADISTICAS
Write-Module "MODULO 6: REPORTES Y ESTADISTICAS"

# Test 6.1: Estadisticas del agente
try {
    $headers = @{ Authorization = "Bearer $agenteToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/agent/stats" -Method Get -Headers $headers
    Write-TestResult "Estadisticas del Agente" $true "Chats asignados: $($response.data.chatsAssigned)"
} catch {
    Write-TestResult "Estadisticas del Agente" $false
}

# Test 6.2: Actividad del agente
try {
    $headers = @{ Authorization = "Bearer $agenteToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/agent/activity" -Method Get -Headers $headers
    Write-TestResult "Actividad del Agente" $true "$($response.data.Length) registros"
} catch {
    Write-TestResult "Actividad del Agente" $false
}

# RESUMEN FINAL
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = $Global:PassedTests + $Global:FailedTests
$percentage = if ($totalTests -gt 0) { [math]::Round(($Global:PassedTests / $totalTests) * 100, 2) } else { 0 }

Write-Host "Total de tests:     $totalTests" -ForegroundColor White
Write-Host "Tests exitosos:     $Global:PassedTests" -ForegroundColor Green
Write-Host "Tests fallidos:     $Global:FailedTests" -ForegroundColor Red
Write-Host "Tasa de exito:      $percentage%" -ForegroundColor $(if ($percentage -ge 90) { "Green" } elseif ($percentage -ge 70) { "Yellow" } else { "Red" })
Write-Host ""

if ($Global:FailedTests -eq 0) {
    Write-Host "TODOS LOS TESTS PASARON!" -ForegroundColor Green
    Write-Host "El sistema esta funcionando correctamente" -ForegroundColor Green
} elseif ($percentage -ge 80) {
    Write-Host "La mayoria de tests pasaron ($percentage%)" -ForegroundColor Yellow
    Write-Host "El sistema esta operativo con algunas limitaciones" -ForegroundColor Yellow
} else {
    Write-Host "Varios tests fallaron ($percentage%)" -ForegroundColor Red
    Write-Host "Revisar la configuracion del sistema" -ForegroundColor Red
}

Write-Host ""
Write-Host "Consulta los logs para mas detalles" -ForegroundColor Gray

exit $(if ($Global:FailedTests -eq 0) { 0 } else { 1 })
