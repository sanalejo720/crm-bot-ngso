# =====================================================
# SCRIPT DE PRUEBAS - MÓDULO USERS
# NGS&O CRM Gestión - Desarrollado por AS Software
# =====================================================

$baseUrl = "http://localhost:3000/api/v1"
$Global:token = $null
$Global:userId = $null

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "👥 PRUEBAS DEL MÓDULO USERS" -ForegroundColor Cyan
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
# TEST 1: CREAR NUEVO USUARIO
# =====================================================
Write-Host "TEST 1: Crear nuevo usuario" -ForegroundColor Yellow
try {
    $userData = @{
        email = "test-user-$(Get-Random -Maximum 9999)@crm.com"
        password = "Test123456"
        firstName = "Usuario"
        lastName = "Prueba $(Get-Random -Maximum 999)"
        roleId = "6b3a5f1c-2d4e-4f5a-8b9c-0d1e2f3a4b5c" # Agente
        status = "active"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/users" -Method Post `
        -ContentType "application/json" -Headers $headers -Body $userData

    $Global:userId = $response.data.id

    Write-Host "✅ Usuario creado exitosamente" -ForegroundColor Green
    Write-Host "   User ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Email: $($response.data.email)" -ForegroundColor Gray
    Write-Host "   Nombre: $($response.data.firstName) $($response.data.lastName)" -ForegroundColor Gray
    Write-Host "   Rol: $($response.data.role.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error creando usuario: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 2: OBTENER TODOS LOS USUARIOS
# =====================================================
Write-Host "`nTEST 2: Obtener todos los usuarios" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers

    Write-Host "✅ Usuarios obtenidos exitosamente" -ForegroundColor Green
    Write-Host "   Total de usuarios: $($response.data.Length)" -ForegroundColor Gray
    
    if ($response.data.Length -gt 0) {
        Write-Host "   Primeros 3 usuarios:" -ForegroundColor Gray
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "   - $($_.firstName) $($_.lastName) ($($_.role.name))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error obteniendo usuarios: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 3: OBTENER USUARIO POR ID
# =====================================================
Write-Host "`nTEST 3: Obtener usuario por ID" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/$Global:userId" -Method Get -Headers $headers

    Write-Host "✅ Usuario obtenido exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "   Nombre: $($response.data.firstName) $($response.data.lastName)" -ForegroundColor Gray
    Write-Host "   Email: $($response.data.email)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo usuario: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 4: ACTUALIZAR USUARIO
# =====================================================
Write-Host "`nTEST 4: Actualizar usuario" -ForegroundColor Yellow
try {
    $updateData = @{
        firstName = "Usuario"
        lastName = "Actualizado"
        phone = "+52155$(Get-Random -Minimum 1000000 -Maximum 9999999)"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/users/$Global:userId" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $updateData

    Write-Host "✅ Usuario actualizado exitosamente" -ForegroundColor Green
    Write-Host "   Nuevo nombre: $($response.data.firstName) $($response.data.lastName)" -ForegroundColor Gray
    Write-Host "   Teléfono: $($response.data.phone)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error actualizando usuario: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 5: ACTUALIZAR ESTADO DEL USUARIO
# =====================================================
Write-Host "`nTEST 5: Actualizar estado del usuario" -ForegroundColor Yellow
try {
    $statusData = @{
        status = "inactive"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/users/$Global:userId/status" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $statusData

    Write-Host "✅ Estado actualizado exitosamente" -ForegroundColor Green
    Write-Host "   Nuevo estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error actualizando estado: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 6: FILTRAR USUARIOS POR ROL
# =====================================================
Write-Host "`nTEST 6: Filtrar usuarios por rol (Agentes)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users?isAgent=true" -Method Get -Headers $headers

    Write-Host "✅ Usuarios filtrados exitosamente" -ForegroundColor Green
    Write-Host "   Total de agentes: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error filtrando usuarios: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 7: FILTRAR USUARIOS POR ESTADO
# =====================================================
Write-Host "`nTEST 7: Filtrar usuarios por estado (Activos)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users?status=active" -Method Get -Headers $headers

    Write-Host "✅ Usuarios activos obtenidos" -ForegroundColor Green
    Write-Host "   Usuarios activos: $($response.data.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error filtrando por estado: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 8: OBTENER AGENTES DISPONIBLES
# =====================================================
Write-Host "`nTEST 8: Obtener agentes disponibles" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/available-agents" -Method Get -Headers $headers

    Write-Host "✅ Agentes disponibles obtenidos" -ForegroundColor Green
    Write-Host "   Agentes disponibles: $($response.data.Length)" -ForegroundColor Gray
    
    if ($response.data.Length -gt 0) {
        Write-Host "   Primeros 3 agentes:" -ForegroundColor Gray
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "   - $($_.firstName) $($_.lastName) (Status: $($_.agentStatus))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error obteniendo agentes disponibles: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 9: CAMBIAR PASSWORD DEL USUARIO
# =====================================================
Write-Host "`nTEST 9: Cambiar password del usuario" -ForegroundColor Yellow
try {
    $passwordData = @{
        oldPassword = "Test123456"
        newPassword = "NewTest123456"
    } | ConvertTo-Json

    # Login con el usuario creado para cambiar su propia password
    $loginData = @{
        email = (Invoke-RestMethod -Uri "$baseUrl/users/$Global:userId" -Method Get -Headers $headers).data.email
        password = "Test123456"
    } | ConvertTo-Json

    $userResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $userHeaders = @{ Authorization = "Bearer $($userResponse.data.accessToken)" }

    $response = Invoke-RestMethod -Uri "$baseUrl/users/$Global:userId/password" -Method Patch `
        -ContentType "application/json" -Headers $userHeaders -Body $passwordData

    Write-Host "✅ Password actualizado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error cambiando password: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 10: ASIGNAR CAMPAÑA A USUARIO
# =====================================================
Write-Host "`nTEST 10: Asignar campaña a usuario" -ForegroundColor Yellow
try {
    $campaignData = @{
        campaignIds = @("e70f1ae0-1b4d-4f57-a2ea-ec9e0ed6c15d")
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/users/$Global:userId/campaigns" -Method Patch `
        -ContentType "application/json" -Headers $headers -Body $campaignData

    Write-Host "✅ Campañas asignadas exitosamente" -ForegroundColor Green
    Write-Host "   Campañas: $($response.data.campaigns.Length)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error asignando campañas: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 11: OBTENER ESTADÍSTICAS DEL USUARIO
# =====================================================
Write-Host "`nTEST 11: Obtener estadísticas del usuario" -ForegroundColor Yellow
try {
    $juanId = "5af97a2a-a9a4-47ea-8d08-b8ff2facc06c"
    $response = Invoke-RestMethod -Uri "$baseUrl/users/$juanId/stats" -Method Get -Headers $headers

    Write-Host "✅ Estadísticas obtenidas" -ForegroundColor Green
    Write-Host "   Chats asignados: $($response.data.totalChats)" -ForegroundColor Gray
    Write-Host "   Chats activos: $($response.data.activeChats)" -ForegroundColor Gray
    Write-Host "   Mensajes enviados: $($response.data.messagesSent)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estadísticas: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 12: DESACTIVAR USUARIO
# =====================================================
Write-Host "`nTEST 12: Desactivar usuario" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/$Global:userId/deactivate" -Method Post `
        -Headers $headers

    Write-Host "✅ Usuario desactivado exitosamente" -ForegroundColor Green
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error desactivando usuario: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 13: REACTIVAR USUARIO
# =====================================================
Write-Host "`nTEST 13: Reactivar usuario" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/$Global:userId/activate" -Method Post `
        -Headers $headers

    Write-Host "✅ Usuario reactivado exitosamente" -ForegroundColor Green
    Write-Host "   Estado: $($response.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error reactivando usuario: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# RESUMEN
# =====================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ PRUEBAS DEL MÓDULO USERS COMPLETADAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
