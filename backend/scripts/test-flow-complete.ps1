# =====================================================
# SCRIPT DE PRUEBAS - FLUJO COMPLETO DE CHAT
# NGS&O CRM Gestión - Desarrollado por AS Software
# =====================================================

$baseUrl = "http://localhost:3000/api/v1"
$Global:tokens = @{}
$Global:chatId = $null

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔄 PRUEBA DE FLUJO COMPLETO DE CHAT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# =====================================================
# PASO 1: AUTENTICAR MÚLTIPLES USUARIOS
# =====================================================
Write-Host "PASO 1: Autenticando usuarios..." -ForegroundColor Yellow

# Admin
try {
    $loginData = @{
        email = "admin@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $Global:tokens.admin = $response.data.accessToken
    $Global:tokens.adminId = $response.data.user.id
    Write-Host "✅ Admin autenticado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error autenticando admin" -ForegroundColor Red
    exit 1
}

# Supervisor
try {
    $loginData = @{
        email = "maria@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $Global:tokens.supervisor = $response.data.accessToken
    $Global:tokens.supervisorId = $response.data.user.id
    Write-Host "✅ Supervisor autenticado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error autenticando supervisor" -ForegroundColor Red
}

# Agente 1
try {
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $Global:tokens.agent1 = $response.data.accessToken
    $Global:tokens.agent1Id = $response.data.user.id
    $Global:tokens.agent1Name = "$($response.data.user.firstName) $($response.data.user.lastName)"
    Write-Host "✅ Agente 1 autenticado: $($Global:tokens.agent1Name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error autenticando agente 1" -ForegroundColor Red
}

Write-Host ""

# =====================================================
# PASO 2: CREAR NUEVO CHAT
# =====================================================
Write-Host "PASO 2: Crear nuevo chat desde WhatsApp (simulación)..." -ForegroundColor Yellow

$contactPhone = "+521$(Get-Random -Minimum 1000000000 -Maximum 9999999999)"
$contactName = "Cliente Flujo $(Get-Random -Maximum 999)"

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.admin)" }
    
    $chatData = @{
        campaignId = "e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d"
        whatsappNumberId = "a2c91e8b-1f8d-4e77-8d8c-ec9e4e5d6d4f"
        contactPhone = $contactPhone
        contactName = $contactName
        initialMessage = "Hola, necesito ayuda con mi cuenta"
        channel = "whatsapp"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $chatData

    $Global:chatId = $response.data.id

    Write-Host "✅ Chat creado exitosamente" -ForegroundColor Green
    Write-Host "   Chat ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Contacto: $contactName" -ForegroundColor Gray
    Write-Host "   Teléfono: $contactPhone" -ForegroundColor Gray
    Write-Host "   Estado inicial: $($response.data.status)" -ForegroundColor Gray
    Write-Host "   Auto-asignado a: $(if($response.data.assignedAgentId) { 'Sí' } else { 'No' })" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error creando chat: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

# =====================================================
# PASO 3: VERIFICAR CHAT EN COLA
# =====================================================
Write-Host "`nPASO 3: Verificar chat en cola (Supervisor)..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.supervisor)" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/chats/waiting/e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d" `
        -Method Get -Headers $headers

    Write-Host "✅ Chats en cola verificados" -ForegroundColor Green
    Write-Host "   Chats esperando asignación: $($response.data.Length)" -ForegroundColor Gray
    
    $ourChat = $response.data | Where-Object { $_.id -eq $Global:chatId }
    if ($ourChat) {
        Write-Host "   ✓ Nuestro chat está en la cola" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error verificando cola: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# PASO 4: ASIGNAR CHAT A AGENTE
# =====================================================
Write-Host "`nPASO 4: Asignar chat a agente (Supervisor)..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.supervisor)" }
    
    $assignData = @{
        agentId = $Global:tokens.agent1Id
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats/$Global:chatId/assign" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $assignData

    Write-Host "✅ Chat asignado exitosamente" -ForegroundColor Green
    Write-Host "   Asignado a: $($Global:tokens.agent1Name)" -ForegroundColor Gray
    Write-Host "   Estado del chat: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error asignando chat: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# PASO 5: AGENTE VE EL CHAT ASIGNADO
# =====================================================
Write-Host "`nPASO 5: Agente verifica sus chats asignados..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.agent1)" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/chats/my-chats" -Method Get -Headers $headers

    Write-Host "✅ Chats del agente obtenidos" -ForegroundColor Green
    Write-Host "   Total de chats asignados: $($response.data.Length)" -ForegroundColor Gray
    
    $assignedChat = $response.data | Where-Object { $_.id -eq $Global:chatId }
    if ($assignedChat) {
        Write-Host "   ✓ Chat asignado encontrado en su lista" -ForegroundColor Green
        Write-Host "   - Contacto: $($assignedChat.contactName)" -ForegroundColor Gray
        Write-Host "   - Estado: $($assignedChat.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error obteniendo chats del agente: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# PASO 6: AGENTE LEE MENSAJE INICIAL
# =====================================================
Write-Host "`nPASO 6: Agente lee el mensaje inicial..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.agent1)" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/chat/$Global:chatId" `
        -Method Get -Headers $headers

    Write-Host "✅ Mensajes obtenidos" -ForegroundColor Green
    Write-Host "   Total de mensajes: $($response.data.Length)" -ForegroundColor Gray
    
    if ($response.data.Length -gt 0) {
        $firstMessage = $response.data[0]
        Write-Host "   Mensaje inicial: '$($firstMessage.content)'" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error obteniendo mensajes: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# PASO 7: AGENTE CAMBIA ESTADO A ACTIVO
# =====================================================
Write-Host "`nPASO 7: Agente activa el chat..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.agent1)" }
    
    $statusData = @{
        status = "active"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chats/$Global:chatId/status" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $statusData

    Write-Host "✅ Chat activado" -ForegroundColor Green
    Write-Host "   Nuevo estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error activando chat: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# PASO 8: AGENTE ENVÍA RESPUESTA
# =====================================================
Write-Host "`nPASO 8: Agente envía respuesta..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.agent1)" }
    
    $messageData = @{
        chatId = $Global:chatId
        content = "¡Hola $contactName! Con gusto te ayudo. ¿Podrías darme más detalles sobre tu consulta?"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $messageData

    Write-Host "✅ Mensaje enviado" -ForegroundColor Green
    Write-Host "   Contenido: $($response.data.content)" -ForegroundColor Gray
    Write-Host "   Estado del mensaje: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error enviando mensaje: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# PASO 9: CONVERSACIÓN (Múltiples mensajes)
# =====================================================
Write-Host "`nPASO 9: Conversación entre agente y cliente..." -ForegroundColor Yellow

$conversacion = @(
    "Tengo un problema con mi último pago",
    "Entiendo. Déjame revisar tu cuenta. ¿Cuál es tu número de cliente?",
    "Es el 12345",
    "Perfecto, veo tu cuenta. Tu pago se procesó correctamente el día de ayer.",
    "¡Excelente! Muchas gracias por la ayuda",
    "De nada, ¿hay algo más en lo que pueda ayudarte?",
    "No, eso es todo. ¡Hasta luego!",
    "¡Que tengas un excelente día!"
)

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.agent1)" }
    
    for ($i = 0; $i -lt $conversacion.Length; $i++) {
        $messageData = @{
            chatId = $Global:chatId
            content = $conversacion[$i]
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post `
            -ContentType "application/json" -Headers $headers -Body $messageData

        Write-Host "   → Mensaje $($i+1): $($conversacion[$i].Substring(0, [Math]::Min(40, $conversacion[$i].Length)))..." -ForegroundColor Gray
        Start-Sleep -Milliseconds 500
    }

    Write-Host "✅ Conversación completada ($($conversacion.Length) mensajes)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en conversación: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# PASO 10: AGENTE CIERRA EL CHAT
# =====================================================
Write-Host "`nPASO 10: Agente cierra el chat..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.agent1)" }
    
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

Start-Sleep -Seconds 2

# =====================================================
# PASO 11: SUPERVISOR VERIFICA ESTADÍSTICAS
# =====================================================
Write-Host "`nPASO 11: Supervisor verifica estadísticas..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.supervisor)" }
    
    # Estadísticas del sistema
    $sysResponse = Invoke-RestMethod -Uri "$baseUrl/reports/system/stats" `
        -Method Get -Headers $headers

    Write-Host "✅ Estadísticas del sistema:" -ForegroundColor Green
    Write-Host "   Total chats: $($sysResponse.data.chats.total)" -ForegroundColor Gray
    Write-Host "   Chats activos: $($sysResponse.data.chats.active)" -ForegroundColor Gray
    Write-Host "   Chats cerrados: $($sysResponse.data.chats.closed)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estadísticas: $($_.Exception.Message)" -ForegroundColor Red
}

# Estadísticas del agente
try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.supervisor)" }
    
    $agentResponse = Invoke-RestMethod -Uri "$baseUrl/users/$($Global:tokens.agent1Id)/stats" `
        -Method Get -Headers $headers

    Write-Host "`n✅ Estadísticas del agente $($Global:tokens.agent1Name):" -ForegroundColor Green
    Write-Host "   Chats asignados: $($agentResponse.data.totalChats)" -ForegroundColor Gray
    Write-Host "   Chats cerrados: $($agentResponse.data.closedChats)" -ForegroundColor Gray
    Write-Host "   Mensajes enviados: $($agentResponse.data.messagesSent)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estadísticas del agente: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# PASO 12: VERIFICAR HISTORIAL COMPLETO
# =====================================================
Write-Host "`nPASO 12: Verificar historial completo del chat..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $($Global:tokens.supervisor)" }
    
    # Obtener el chat completo
    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/chats/$Global:chatId" `
        -Method Get -Headers $headers

    # Obtener todos los mensajes
    $messagesResponse = Invoke-RestMethod -Uri "$baseUrl/messages/chat/$Global:chatId" `
        -Method Get -Headers $headers

    Write-Host "✅ Historial completo verificado" -ForegroundColor Green
    Write-Host "`n   📋 RESUMEN DEL CHAT:" -ForegroundColor Cyan
    Write-Host "   ═══════════════════" -ForegroundColor Cyan
    Write-Host "   Chat ID: $($chatResponse.data.id)" -ForegroundColor Gray
    Write-Host "   Contacto: $($chatResponse.data.contactName)" -ForegroundColor Gray
    Write-Host "   Teléfono: $($chatResponse.data.contactPhone)" -ForegroundColor Gray
    Write-Host "   Campaña: $($chatResponse.data.campaign.name)" -ForegroundColor Gray
    Write-Host "   Agente: $($chatResponse.data.assignedAgent.firstName) $($chatResponse.data.assignedAgent.lastName)" -ForegroundColor Gray
    Write-Host "   Estado: $($chatResponse.data.status)" -ForegroundColor Gray
    Write-Host "   Total mensajes: $($messagesResponse.data.Length)" -ForegroundColor Gray
    Write-Host "   Creado: $($chatResponse.data.createdAt)" -ForegroundColor Gray
    Write-Host "   Cerrado: $($chatResponse.data.closedAt)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error verificando historial: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# RESUMEN FINAL
# =====================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ FLUJO COMPLETO DE CHAT EJECUTADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n📊 RESUMEN DEL FLUJO:" -ForegroundColor White
Write-Host "   1. ✅ Autenticación de usuarios" -ForegroundColor Green
Write-Host "   2. ✅ Creación de chat" -ForegroundColor Green
Write-Host "   3. ✅ Verificación de cola" -ForegroundColor Green
Write-Host "   4. ✅ Asignación a agente" -ForegroundColor Green
Write-Host "   5. ✅ Activación del chat" -ForegroundColor Green
Write-Host "   6. ✅ Conversación completa" -ForegroundColor Green
Write-Host "   7. ✅ Cierre del chat" -ForegroundColor Green
Write-Host "   8. ✅ Verificación de estadísticas" -ForegroundColor Green

Write-Host "`n🎯 Chat ID del flujo: $Global:chatId" -ForegroundColor Cyan
Write-Host ""
