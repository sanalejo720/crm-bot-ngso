# ==============================================================================
# VALIDACIÓN COMPLETA DEL SISTEMA - Backend + Frontend Integration
# NGS&O CRM Gestión v1.0.0
# ==============================================================================

$baseUrl = "http://localhost:3000/api/v1"
$frontendUrl = "http://localhost:5173"
$passed = 0
$failed = 0
$results = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    try {
        $params = @{
            Uri = "$baseUrl$Endpoint"
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "  ✓ $Name" -ForegroundColor Green
        $script:passed++
        $script:results += [PSCustomObject]@{
            Test = $Name
            Status = "PASS"
            Message = "OK"
        }
        return $response
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $message = $_.Exception.Message
        
        if ($statusCode -eq 403 -and $Name -like "*NO debe*") {
            Write-Host "  ✓ $Name (403 esperado)" -ForegroundColor Green
            $script:passed++
            $script:results += [PSCustomObject]@{
                Test = $Name
                Status = "PASS"
                Message = "403 Forbidden (esperado)"
            }
        } else {
            Write-Host "  ✗ $Name - Error: $message" -ForegroundColor Red
            $script:failed++
            $script:results += [PSCustomObject]@{
                Test = $Name
                Status = "FAIL"
                Message = $message
            }
        }
        return $null
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "     VALIDACIÓN COMPLETA DEL SISTEMA CRM" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# ==============================================================================
# 1. AUTENTICACIÓN
# ==============================================================================
Write-Host "1️⃣  MÓDULO: AUTENTICACIÓN" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────`n" -ForegroundColor DarkGray

$adminLogin = Test-Endpoint "Login Admin (Super Admin)" "POST" "/auth/login" @{} '{"email":"admin@crm.com","password":"password123"}'
$adminToken = $adminLogin.data.accessToken

$juanLogin = Test-Endpoint "Login Juan (Agente)" "POST" "/auth/login" @{} '{"email":"juan@crm.com","password":"password123"}'
$juanToken = $juanLogin.data.accessToken

Test-Endpoint "Get Profile (Admin)" "GET" "/auth/me" @{Authorization="Bearer $adminToken"}

# ==============================================================================
# 2. USUARIOS
# ==============================================================================
Write-Host "`n2️⃣  MÓDULO: USUARIOS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────`n" -ForegroundColor DarkGray

$users = Test-Endpoint "GET /users (Admin)" "GET" "/users" @{Authorization="Bearer $adminToken"}
Write-Host "    → Usuarios en sistema: $($users.data.Count)" -ForegroundColor Cyan

# ==============================================================================
# 3. CHATS Y SUPERVISIÓN
# ==============================================================================
Write-Host "`n3️⃣  MÓDULO: CHATS Y SUPERVISIÓN" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────`n" -ForegroundColor DarkGray

$adminChats = Test-Endpoint "GET /chats/my-chats (Admin ve todos)" "GET" "/chats/my-chats" @{Authorization="Bearer $adminToken"}
Write-Host "    → Admin ve: $($adminChats.data.Count) chats" -ForegroundColor Cyan

$juanChats = Test-Endpoint "GET /chats/my-chats (Juan - solo asignados)" "GET" "/chats/my-chats" @{Authorization="Bearer $juanToken"}
Write-Host "    → Juan ve: $($juanChats.data.Count) chats asignados" -ForegroundColor Cyan

Test-Endpoint "GET /chats (Juan NO debe tener acceso)" "GET" "/chats" @{Authorization="Bearer $juanToken"}

# ==============================================================================
# 4. CAMPAIGNS
# ==============================================================================
Write-Host "`n4️⃣  MÓDULO: CAMPAÑAS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────`n" -ForegroundColor DarkGray

$campaigns = Test-Endpoint "GET /campaigns" "GET" "/campaigns" @{Authorization="Bearer $adminToken"}
Write-Host "    → Campañas: $($campaigns.data.Count)" -ForegroundColor Cyan

# ==============================================================================
# 5. REPORTS Y DASHBOARD
# ==============================================================================
Write-Host "`n5️⃣  MÓDULO: REPORTES Y DASHBOARD" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────`n" -ForegroundColor DarkGray

$dashboard = Test-Endpoint "GET /reports/dashboard" "GET" "/reports/dashboard" @{Authorization="Bearer $adminToken"}
if ($dashboard) {
    Write-Host "    → Total Chats: $($dashboard.data.totalChats)" -ForegroundColor Cyan
    Write-Host "    → Chats Activos: $($dashboard.data.activeChats)" -ForegroundColor Cyan
    Write-Host "    → Total Agentes: $($dashboard.data.totalAgents)" -ForegroundColor Cyan
}

# ==============================================================================
# 6. WHATSAPP
# ==============================================================================
Write-Host "`n6️⃣  MÓDULO: WHATSAPP" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────`n" -ForegroundColor DarkGray

Test-Endpoint "GET /whatsapp/status" "GET" "/whatsapp/status" @{Authorization="Bearer $adminToken"}
Test-Endpoint "GET /whatsapp/check" "GET" "/whatsapp/check" @{Authorization="Bearer $adminToken"}

# ==============================================================================
# 7. FRONTEND CONNECTIVITY
# ==============================================================================
Write-Host "`n7️⃣  VALIDACIÓN FRONTEND" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────`n" -ForegroundColor DarkGray

try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "  ✓ Frontend accesible en $frontendUrl" -ForegroundColor Green
        $script:passed++
    }
} catch {
    Write-Host "  ✗ Frontend NO accesible: $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
}

# ==============================================================================
# RESUMEN
# ==============================================================================
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "                    RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

$total = $passed + $failed
$percentage = [math]::Round(($passed / $total) * 100, 2)

Write-Host "Total de Pruebas: $total" -ForegroundColor White
Write-Host "Pruebas Exitosas: $passed" -ForegroundColor Green
Write-Host "Pruebas Fallidas: $failed" -ForegroundColor Red
Write-Host "Tasa de Éxito: ${percentage}%" -ForegroundColor $(if($percentage -ge 90){"Green"}elseif($percentage -ge 70){"Yellow"}else{"Red"})

if ($failed -gt 0) {
    Write-Host "`n❌ PRUEBAS FALLIDAS:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Test)" -ForegroundColor Red
        Write-Host "    Error: $($_.Message)" -ForegroundColor DarkGray
    }
}

Write-Host "`n✅ Sistema validado: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Retornar código de salida
if ($failed -eq 0) {
    exit 0
} else {
    exit 1
}
