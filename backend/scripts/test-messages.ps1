# =====================================================
# SCRIPT DE PRUEBAS - MÓDULO MESSAGES
# NGS&O CRM Gestión - Desarrollado por AS Software
# =====================================================

$baseUrl = "http://localhost:3000/api/v1"
$Global:token = $null
$Global:chatId = $null
$Global:messageId = $null

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📨 PRUEBAS DEL MÓDULO MESSAGES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# =====================================================
# AUTENTICACIÓN Y PREPARACIÓN
# =====================================================
Write-Host "Preparando ambiente de pruebas..." -ForegroundColor Yellow
try {
    # Login
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $Global:token = $response.data.accessToken
    $headers = @{ Authorization = "Bearer $Global:token" }

    # Obtener un chat existente
    $chatsResponse = Invoke-RestMethod -Uri "$baseUrl/chats/my-chats" -Method Get -Headers $headers
    
    if ($chatsResponse.data.Length -gt 0) {
        $Global:chatId = $chatsResponse.data[0].id
        Write-Host "✅ Ambiente preparado" -ForegroundColor Green
        Write-Host "   Chat de prueba: $Global:chatId`n" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ No hay chats disponibles para pruebas" -ForegroundColor Yellow
        Write-Host "   Creando un chat nuevo...`n" -ForegroundColor Yellow
        
        # Crear un chat nuevo
        $chatData = @{
            campaignId = "e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d"
            whatsappNumberId = "a2c91e8b-1f8d-4e77-8d8c-ec9e4e5d6d4f"
            contactPhone = "+521$(Get-Random -Minimum 1000000000 -Maximum 9999999999)"
            contactName = "Cliente Mensajes $(Get-Random -Maximum 999)"
            initialMessage = "Hola"
            channel = "whatsapp"
        } | ConvertTo-Json

        $chatResponse = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Post `
            -ContentType "application/json" -Headers $headers -Body $chatData
        
        $Global:chatId = $chatResponse.data.id
        Write-Host "✅ Chat creado: $Global:chatId`n" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error en preparación: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $Global:token" }

# =====================================================
# TEST 1: ENVIAR MENSAJE DE TEXTO
# =====================================================
Write-Host "TEST 1: Enviar mensaje de texto" -ForegroundColor Yellow
try {
    $messageData = @{
        chatId = $Global:chatId
        content = "Hola, este es un mensaje de prueba enviado a las $(Get-Date -Format 'HH:mm:ss')"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $messageData

    $Global:messageId = $response.data.id

    Write-Host "✅ Mensaje enviado exitosamente" -ForegroundColor Green
    Write-Host "   Message ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Contenido: $($response.data.content)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error enviando mensaje: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# TEST 2: OBTENER MENSAJES DE UN CHAT
# =====================================================
Write-Host "`nTEST 2: Obtener mensajes de un chat" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/chat/$Global:chatId" -Method Get -Headers $headers

    Write-Host "✅ Mensajes obtenidos exitosamente" -ForegroundColor Green
    Write-Host "   Total de mensajes: $($response.data.Length)" -ForegroundColor Gray
    
    if ($response.data.Length -gt 0) {
        Write-Host "   Últimos 3 mensajes:" -ForegroundColor Gray
        $response.data | Select-Object -Last 3 | ForEach-Object {
            Write-Host "   - $(if($_.isFromContact) {'Cliente'} else {'Agente'}): $($_.content.Substring(0, [Math]::Min(50, $_.content.Length)))..." -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error obteniendo mensajes: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 3: OBTENER MENSAJES CON PAGINACIÓN
# =====================================================
Write-Host "`nTEST 3: Obtener mensajes con paginación" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/chat/$Global:chatId`?limit=5&offset=0" -Method Get -Headers $headers

    Write-Host "✅ Mensajes paginados obtenidos" -ForegroundColor Green
    Write-Host "   Mensajes en esta página: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo mensajes paginados: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 4: OBTENER MENSAJE POR ID
# =====================================================
Write-Host "`nTEST 4: Obtener mensaje por ID" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$Global:messageId" -Method Get -Headers $headers

    Write-Host "✅ Mensaje obtenido exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Contenido: $($response.data.content)" -ForegroundColor Gray
    Write-Host "   De contacto: $($response.data.isFromContact)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
    Write-Host "   Timestamp: $($response.data.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo mensaje: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 5: ENVIAR MÚLTIPLES MENSAJES
# =====================================================
Write-Host "`nTEST 5: Enviar múltiples mensajes" -ForegroundColor Yellow
$mensajesEnviados = 0
try {
    for ($i = 1; $i -le 3; $i++) {
        $messageData = @{
            chatId = $Global:chatId
            content = "Mensaje de prueba #$i - $(Get-Date -Format 'HH:mm:ss')"
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post `
            -ContentType "application/json" -Headers $headers -Body $messageData

        $mensajesEnviados++
        Start-Sleep -Milliseconds 500
    }

    Write-Host "✅ $mensajesEnviados mensajes enviados exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error enviando mensajes múltiples: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 6: ENVIAR MENSAJE CON EMOJI
# =====================================================
Write-Host "`nTEST 6: Enviar mensaje con emoji" -ForegroundColor Yellow
try {
    $messageData = @{
        chatId = $Global:chatId
        content = "¡Hola! 👋 Gracias por contactarnos 😊 ¿En qué podemos ayudarte? 🚀"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $messageData

    Write-Host "✅ Mensaje con emoji enviado" -ForegroundColor Green
    Write-Host "   Contenido: $($response.data.content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error enviando mensaje con emoji: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 7: ENVIAR MENSAJE LARGO
# =====================================================
Write-Host "`nTEST 7: Enviar mensaje largo" -ForegroundColor Yellow
try {
    $longMessage = "Este es un mensaje de prueba muy largo. " * 20

    $messageData = @{
        chatId = $Global:chatId
        content = $longMessage
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $messageData

    Write-Host "✅ Mensaje largo enviado" -ForegroundColor Green
    Write-Host "   Longitud del mensaje: $($response.data.content.Length) caracteres" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error enviando mensaje largo: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 8: ENVIAR MENSAJE CON CARACTERES ESPECIALES
# =====================================================
Write-Host "`nTEST 8: Enviar mensaje con caracteres especiales" -ForegroundColor Yellow
try {
    $messageData = @{
        chatId = $Global:chatId
        content = "Prueba de caracteres: áéíóú ñÑ ¿? ¡! @#$%&*() <>"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $messageData

    Write-Host "✅ Mensaje con caracteres especiales enviado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error enviando mensaje especial: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 9: VERIFICAR CONTADOR DE MENSAJES
# =====================================================
Write-Host "`nTEST 9: Verificar contador de mensajes" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/chat/$Global:chatId" -Method Get -Headers $headers

    Write-Host "✅ Contador verificado" -ForegroundColor Green
    Write-Host "   Total de mensajes en el chat: $($response.data.Length)" -ForegroundColor Gray
    
    $fromAgent = ($response.data | Where-Object { -not $_.isFromContact }).Count
    $fromContact = ($response.data | Where-Object { $_.isFromContact }).Count
    
    Write-Host "   Mensajes del agente: $fromAgent" -ForegroundColor Gray
    Write-Host "   Mensajes del contacto: $fromContact" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error verificando contador: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 10: ENVIAR MENSAJE SIN CONTENIDO (debe fallar)
# =====================================================
Write-Host "`nTEST 10: Enviar mensaje vacío (debe fallar)" -ForegroundColor Yellow
try {
    $messageData = @{
        chatId = $Global:chatId
        content = ""
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/messages/send" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $messageData

    Write-Host "❌ Debería haber fallado pero respondió exitosamente" -ForegroundColor Red
} catch {
    Write-Host "✅ Error esperado: Mensaje vacío rechazado correctamente" -ForegroundColor Green
}

# =====================================================
# RESUMEN
# =====================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ PRUEBAS DEL MÓDULO MESSAGES COMPLETADAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
