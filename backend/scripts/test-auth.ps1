# =====================================================
# SCRIPT DE PRUEBAS - MÓDULO AUTH
# NGS&O CRM Gestión - Desarrollado por AS Software
# =====================================================

$baseUrl = "http://localhost:3000/api/v1"
$Global:token = $null
$Global:userId = $null

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔐 PRUEBAS DEL MÓDULO AUTH" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# =====================================================
# TEST 1: REGISTRO DE USUARIO (Desarrollo)
# =====================================================
Write-Host "TEST 1: Registro de nuevo usuario" -ForegroundColor Yellow
try {
    $registerData = @{
        email = "test-$(Get-Random -Maximum 9999)@crm.com"
        password = "Test123456"
        firstName = "Usuario"
        lastName = "Prueba"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post `
        -ContentType "application/json" -Body $registerData

    Write-Host "✅ Usuario registrado exitosamente" -ForegroundColor Green
    Write-Host "   Email: $($response.data.email)" -ForegroundColor Gray
    Write-Host "   ID: $($response.data.id)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en registro: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 2: LOGIN CON CREDENCIALES VÁLIDAS
# =====================================================
Write-Host "`nTEST 2: Login con credenciales válidas" -ForegroundColor Yellow
try {
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    $Global:token = $response.data.accessToken
    $Global:userId = $response.data.user.id

    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Usuario: $($response.data.user.firstName) $($response.data.user.lastName)" -ForegroundColor Gray
    Write-Host "   Email: $($response.data.user.email)" -ForegroundColor Gray
    Write-Host "   Rol: $($response.data.user.role.name)" -ForegroundColor Gray
    Write-Host "   Token generado: $($Global:token.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# =====================================================
# TEST 3: LOGIN CON CREDENCIALES INVÁLIDAS
# =====================================================
Write-Host "`nTEST 3: Login con credenciales inválidas" -ForegroundColor Yellow
try {
    $loginData = @{
        email = "juan@crm.com"
        password = "wrongpassword"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginData

    Write-Host "❌ Debería haber fallado pero respondió exitosamente" -ForegroundColor Red
} catch {
    Write-Host "✅ Error esperado: Login rechazado correctamente" -ForegroundColor Green
}

# =====================================================
# TEST 4: OBTENER PERFIL DEL USUARIO AUTENTICADO
# =====================================================
Write-Host "`nTEST 4: Obtener perfil del usuario" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $Global:token" }
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers

    Write-Host "✅ Perfil obtenido exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Gray
    Write-Host "   Nombre: $($response.firstName) $($response.lastName)" -ForegroundColor Gray
    Write-Host "   Email: $($response.email)" -ForegroundColor Gray
    Write-Host "   Rol: $($response.role.name)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo perfil: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 5: ACCESO SIN TOKEN (debe fallar)
# =====================================================
Write-Host "`nTEST 5: Acceso sin token de autenticación" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get
    Write-Host "❌ Debería haber fallado pero respondió exitosamente" -ForegroundColor Red
} catch {
    Write-Host "✅ Error esperado: Acceso rechazado correctamente" -ForegroundColor Green
}

# =====================================================
# TEST 6: ACCESO CON TOKEN INVÁLIDO (debe fallar)
# =====================================================
Write-Host "`nTEST 6: Acceso con token inválido" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer token_invalido_123456" }
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers
    Write-Host "❌ Debería haber fallado pero respondió exitosamente" -ForegroundColor Red
} catch {
    Write-Host "✅ Error esperado: Token rechazado correctamente" -ForegroundColor Green
}

# =====================================================
# TEST 7: GENERAR SECRET 2FA
# =====================================================
Write-Host "`nTEST 7: Generar secret para 2FA" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $Global:token" }
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/2fa/generate" -Method Post -Headers $headers

    Write-Host "✅ Secret 2FA generado exitosamente" -ForegroundColor Green
    Write-Host "   QR Code URL generado" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error generando 2FA: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# TEST 8: LOGOUT
# =====================================================
Write-Host "`nTEST 8: Cerrar sesión" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $Global:token" }
    Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method Post -Headers $headers
    Write-Host "✅ Sesión cerrada exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en logout: $($_.Exception.Message)" -ForegroundColor Red
}

# =====================================================
# RESUMEN
# =====================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ PRUEBAS DEL MÓDULO AUTH COMPLETADAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
