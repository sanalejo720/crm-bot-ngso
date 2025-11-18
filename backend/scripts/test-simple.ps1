# Test Simple de API - CRM NGS&O
# Este script realiza pruebas básicas de los endpoints principales

$baseUrl = "http://localhost:3000/api/v1"
$testsPassed = 0
$testsFailed = 0

Write-Host "`n=== INICIANDO PRUEBAS BASICAS ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Login
Write-Host "[1/5] Probando login..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "juan@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $token = $response.data.accessToken
    
    Write-Host "  OK - Login exitoso" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "  ERROR - Login fallido" -ForegroundColor Red
    $testsFailed++
    exit 1
}

# Test 2: Obtener perfil
Write-Host "[2/5] Probando obtener perfil..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers
    
    Write-Host "  OK - Perfil obtenido: $($response.data.name)" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "  ERROR - No se pudo obtener perfil" -ForegroundColor Red
    $testsFailed++
}

# Test 3: Listar chats
Write-Host "[3/5] Probando listar chats..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $response = Invoke-RestMethod -Uri "$baseUrl/chats/my-chats" -Method Get -Headers $headers
    
    Write-Host "  OK - Chats obtenidos: $($response.data.Length) chats" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "  ERROR - No se pudieron obtener chats" -ForegroundColor Red
    $testsFailed++
}

# Test 4: Obtener estadisticas
Write-Host "[4/5] Probando estadisticas de agente..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $response = Invoke-RestMethod -Uri "$baseUrl/reports/agent/stats" -Method Get -Headers $headers
    
    Write-Host "  OK - Estadisticas: $($response.data.chatsAssigned) chats asignados" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "  ERROR - No se pudieron obtener estadisticas" -ForegroundColor Red
    $testsFailed++
}

# Test 5: Listar campanas
Write-Host "[5/5] Probando listar campanas..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $response = Invoke-RestMethod -Uri "$baseUrl/campaigns" -Method Get -Headers $headers
    
    Write-Host "  OK - Campanas obtenidas: $($response.data.Length) campanas" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "  ERROR - No se pudieron obtener campanas" -ForegroundColor Red
    $testsFailed++
}

# Resumen
Write-Host "`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Tests ejecutados: $($testsPassed + $testsFailed)" -ForegroundColor White
Write-Host "Tests exitosos:   $testsPassed" -ForegroundColor Green
Write-Host "Tests fallidos:   $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host "`nTODOS LOS TESTS PASARON!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nALGUNOS TESTS FALLARON" -ForegroundColor Red
    exit 1
}
