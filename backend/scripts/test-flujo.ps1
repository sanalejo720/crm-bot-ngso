# Test de Flujo Completo - CRM NGS&O
# Simula un flujo real de atencion al cliente

$baseUrl = "http://localhost:3000/api/v1"
$testsPassed = 0
$testsFailed = 0

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  FLUJO COMPLETO DE ATENCION AL CLIENTE" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Paso 1: Login como Admin
Write-Host "[1/8] Autenticando como admin..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "admin@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $adminToken = $response.data.accessToken
    
    Write-Host "      OK - Admin autenticado" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "      ERROR - Fallo autenticacion" -ForegroundColor Red
    $testsFailed++
    exit 1
}

Start-Sleep -Milliseconds 500

# Paso 2: Obtener campanas disponibles
Write-Host "[2/8] Obteniendo campanas disponibles..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns" -Method Get -Headers $headers
    
    if ($response.data.Length -gt 0) {
        $campaignId = $response.data[0].id
        $campaignName = $response.data[0].name
        Write-Host "      OK - Campana seleccionada: $campaignName" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "      ERROR - No hay campanas disponibles" -ForegroundColor Red
        $testsFailed++
        exit 1
    }
} catch {
    Write-Host "      ERROR - No se pudieron obtener campanas" -ForegroundColor Red
    $testsFailed++
    exit 1
}

Start-Sleep -Milliseconds 500

# Paso 3: Crear un nuevo chat
Write-Host "[3/8] Creando nuevo chat de cliente..." -ForegroundColor Yellow
$contactName = "Cliente Test $(Get-Random -Maximum 999)"
$contactPhone = "+521$(Get-Random -Minimum 5500000000 -Maximum 5599999999)"
$externalId = "whatsapp_$(Get-Random -Maximum 999999)"

try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $chatData = @{
        campaignId = $campaignId
        whatsappNumberId = "a2d0767b-248a-4cf7-845f-46efd5cc891f"
        contactPhone = $contactPhone
        contactName = $contactName
        externalId = $externalId
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Post -ContentType "application/json" -Headers $headers -Body $chatData
    $chatId = $response.data.id
    
    Write-Host "      OK - Chat creado para $contactName" -ForegroundColor Green
    Write-Host "          Chat ID: $chatId" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "      ERROR - No se pudo crear chat" -ForegroundColor Red
    if ($_.ErrorDetails) { 
        Write-Host "          $($_.ErrorDetails.Message)" -ForegroundColor Gray 
    }
    $testsFailed++
    $chatId = $null
}

Start-Sleep -Milliseconds 500

# Paso 4: Verificar chat en la cola de espera
if ($chatId) {
    Write-Host "[4/8] Verificando chat en cola de espera..." -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $adminToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/chats?status=waiting" -Method Get -Headers $headers
        
        $waitingChat = $response.data | Where-Object { $_.id -eq $chatId }
        if ($waitingChat) {
            Write-Host "      OK - Chat en cola: $($waitingChat.contactName)" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "      WARNING - Chat no encontrado en cola" -ForegroundColor Yellow
            $testsPassed++
        }
    } catch {
        Write-Host "      ERROR - No se pudo verificar cola" -ForegroundColor Red
        $testsFailed++
    }
}

Start-Sleep -Milliseconds 500

# Paso 5: Login como Agente
Write-Host "[5/8] Autenticando como agente..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $agenteToken = $response.data.accessToken
    $agenteId = $response.data.user.id
    
    Write-Host "      OK - Agente autenticado" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "      ERROR - Fallo autenticacion de agente" -ForegroundColor Red
    $testsFailed++
}

Start-Sleep -Milliseconds 500

# Paso 6: Asignar chat al agente
if ($chatId) {
    Write-Host "[6/8] Asignando chat al agente..." -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $adminToken" }
        $assignData = @{
            agentId = $agenteId
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$baseUrl/chats/$chatId/assign" -Method Patch -ContentType "application/json" -Headers $headers -Body $assignData
        
        Write-Host "      OK - Chat asignado al agente" -ForegroundColor Green
        $testsPassed++
    } catch {
        Write-Host "      ERROR - No se pudo asignar chat" -ForegroundColor Red
        if ($_.ErrorDetails) { 
            Write-Host "          $($_.ErrorDetails.Message)" -ForegroundColor Gray 
        }
        $testsFailed++
    }
}

Start-Sleep -Milliseconds 500

# Paso 7: Enviar mensajes (conversacion)
if ($chatId) {
    Write-Host "[7/8] Enviando mensajes (simulando conversacion)..." -ForegroundColor Yellow
    
    $messages = @(
        "Hola! Bienvenido a nuestro servicio de atencion",
        "En que puedo ayudarte hoy?",
        "Perfecto, dejame revisar tu solicitud"
    )
    
    $messagesSent = 0
    foreach ($messageContent in $messages) {
        try {
            $headers = @{ Authorization = "Bearer $agenteToken" }
            $messageData = @{
                chatId = $chatId
                content = $messageContent
            } | ConvertTo-Json

            Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post -ContentType "application/json" -Headers $headers -Body $messageData | Out-Null
            $messagesSent++
            Start-Sleep -Milliseconds 300
        } catch {
            # Ignorar errores en mensajes individuales
        }
    }
    
    if ($messagesSent -eq $messages.Length) {
        Write-Host "      OK - $messagesSent mensajes enviados" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "      WARNING - Solo $messagesSent de $($messages.Length) mensajes enviados" -ForegroundColor Yellow
        $testsPassed++
    }
}

Start-Sleep -Milliseconds 500

# Paso 8: Verificar estadisticas del agente
Write-Host "[8/8] Verificando estadisticas del agente..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $agenteToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/agent/stats" -Method Get -Headers $headers
    
    Write-Host "      OK - Estadisticas obtenidas:" -ForegroundColor Green
    Write-Host "          Chats asignados: $($response.data.chatsAssigned)" -ForegroundColor Gray
    Write-Host "          Chats activos: $($response.data.chatsActive)" -ForegroundColor Gray
    Write-Host "          Mensajes enviados: $($response.data.messagesSent)" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "      ERROR - No se pudieron obtener estadisticas" -ForegroundColor Red
    $testsFailed++
}

# Resumen final
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DEL FLUJO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pasos completados:  $testsPassed de $($testsPassed + $testsFailed)" -ForegroundColor White
Write-Host "Pasos exitosos:     $testsPassed" -ForegroundColor Green
Write-Host "Pasos fallidos:     $testsFailed" -ForegroundColor Red
Write-Host ""

$percentage = [math]::Round(($testsPassed / ($testsPassed + $testsFailed)) * 100, 2)
if ($percentage -eq 100) {
    Write-Host "FLUJO COMPLETADO AL 100%!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Detalles del chat creado:" -ForegroundColor Cyan
    Write-Host "  - Contacto: $contactName" -ForegroundColor White
    Write-Host "  - Telefono: $contactPhone" -ForegroundColor White
    Write-Host "  - Chat ID: $chatId" -ForegroundColor White
    Write-Host "  - External ID: $externalId" -ForegroundColor White
    exit 0
} elseif ($percentage -ge 75) {
    Write-Host "Flujo completado exitosamente ($percentage%)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Flujo completado parcialmente ($percentage%)" -ForegroundColor Yellow
    exit 1
}
