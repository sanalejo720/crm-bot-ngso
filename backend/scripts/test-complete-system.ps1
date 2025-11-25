# 🧪 Sistema de Testing Completo - NGS&O CRM
# Script para probar TODOS los endpoints implementados
# Fecha: 18 de Noviembre, 2025

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "     TESTING COMPLETO - NGSO CRM v1.0.0            " -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api/v1"
$testResults = @()

# ============================================
# FUNCIÓN: Test Endpoint
# ============================================
function Test-Endpoint {
    param(
        [string]$Module,
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
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        
        $result = @{
            Module = $Module
            Test = $Name
            Status = "PASS"
            StatusCode = 200
            Message = "OK"
        }
        
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $result = @{
            Module = $Module
            Test = $Name
            Status = "FAIL"
            StatusCode = $statusCode
            Message = $_.Exception.Message
        }
        
        Write-Host "  [FAIL] $Name - Error: $statusCode" -ForegroundColor Red
    }
    
    $script:testResults += $result
    return $result
}

# ============================================
# MÓDULO 1: AUTENTICACIÓN
# ============================================
Write-Host "`n📦 MÓDULO 1: AUTENTICACIÓN" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 1.1: Login Super Admin
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@crm.com","password":"password123"}'
$adminToken = $loginResponse.data.accessToken
Test-Endpoint "Auth" "Login Super Admin" "POST" "/auth/login" @{} '{"email":"admin@crm.com","password":"password123"}'

# Test 1.2: Login Supervisor
$supervisorLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"juan@crm.com","password":"password123"}'
$supervisorToken = $supervisorLogin.data.accessToken
Test-Endpoint "Auth" "Login Supervisor" "POST" "/auth/login" @{} '{"email":"juan@crm.com","password":"password123"}'

# Test 1.3: Login Agente
$agentLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"laura@crm.com","password":"password123"}'
$agentToken = $agentLogin.data.accessToken
Test-Endpoint "Auth" "Login Agente" "POST" "/auth/login" @{} '{"email":"laura@crm.com","password":"password123"}'

# Test 1.4: Get Profile
Test-Endpoint "Auth" "Get Profile" "GET" "/auth/me" @{Authorization="Bearer $adminToken"}

# Test 1.5: Refresh Token
Test-Endpoint "Auth" "Refresh Token" "POST" "/auth/refresh" @{} "{`"refreshToken`":`"$($loginResponse.data.refreshToken)`"}"

# ============================================
# MÓDULO 2: USUARIOS
# ============================================
Write-Host "`n📦 MÓDULO 2: USUARIOS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 2.1: Obtener todos los usuarios (Admin)
Test-Endpoint "Users" "Get All Users (Admin)" "GET" "/users" @{Authorization="Bearer $adminToken"}

# Test 2.2: Obtener solo agentes
Test-Endpoint "Users" "Get Agents Only" "GET" "/users?isAgent=true" @{Authorization="Bearer $adminToken"}

# Test 2.3: Obtener usuario por ID
Test-Endpoint "Users" "Get User by ID" "GET" "/users/1" @{Authorization="Bearer $adminToken"}

# Test 2.4: Actualizar usuario
$updateUserBody = '{"phone":"+57300123456","maxConcurrentChats":6}'
Test-Endpoint "Users" "Update User" "PATCH" "/users/2" @{Authorization="Bearer $adminToken"} $updateUserBody

# Test 2.5: Cambiar estado de agente
$changeStateBody = '{"agentState":"available"}'
Test-Endpoint "Users" "Change Agent State" "PATCH" "/users/2/state" @{Authorization="Bearer $adminToken"} $changeStateBody

# ============================================
# MÓDULO 3: ROLES Y PERMISOS
# ============================================
Write-Host "`n📦 MÓDULO 3: ROLES Y PERMISOS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 3.1: Obtener todos los roles
Test-Endpoint "Roles" "Get All Roles" "GET" "/roles" @{Authorization="Bearer $adminToken"}

# Test 3.2: Obtener permisos por rol
Test-Endpoint "Roles" "Get Role Permissions" "GET" "/roles/1/permissions" @{Authorization="Bearer $adminToken"}

# ============================================
# MÓDULO 4: CHATS
# ============================================
Write-Host "`n📦 MÓDULO 4: CHATS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 4.1: Obtener todos los chats (Supervisor)
Test-Endpoint "Chats" "Get All Chats (Supervisor)" "GET" "/chats" @{Authorization="Bearer $supervisorToken"}

# Test 4.2: Obtener chats del agente
Test-Endpoint "Chats" "Get My Chats (Agent)" "GET" "/chats/my-chats" @{Authorization="Bearer $agentToken"}

# Test 4.3: Obtener chat por ID
Test-Endpoint "Chats" "Get Chat by ID" "GET" "/chats/1" @{Authorization="Bearer $supervisorToken"}

# Test 4.4: Filtrar chats por estado
Test-Endpoint "Chats" "Filter Chats (Active)" "GET" "/chats?status=active" @{Authorization="Bearer $supervisorToken"}

# Test 4.5: Filtrar chats en espera
Test-Endpoint "Chats" "Filter Chats (Waiting)" "GET" "/chats?status=waiting" @{Authorization="Bearer $supervisorToken"}

# Test 4.6: Asignar chat a agente
$assignBody = '{"agentId":"2"}'
Test-Endpoint "Chats" "Assign Chat to Agent" "PATCH" "/chats/1/assign" @{Authorization="Bearer $supervisorToken"} $assignBody

# Test 4.7: Cambiar estado del chat
$statusBody = '{"status":"active"}'
Test-Endpoint "Chats" "Update Chat Status" "PATCH" "/chats/1/status" @{Authorization="Bearer $supervisorToken"} $statusBody

# Test 4.8: Cerrar chat
$closeBody = '{"status":"closed","resolution":"Cliente contactado"}'
Test-Endpoint "Chats" "Close Chat" "PATCH" "/chats/1/status" @{Authorization="Bearer $agentToken"} $closeBody

# ============================================
# MÓDULO 5: MENSAJES
# ============================================
Write-Host "`n📦 MÓDULO 5: MENSAJES" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 5.1: Obtener mensajes de un chat
Test-Endpoint "Messages" "Get Chat Messages" "GET" "/messages?chatId=1" @{Authorization="Bearer $agentToken"}

# Test 5.2: Enviar mensaje
$sendMessageBody = '{"chatId":"1","text":"Hola, ¿en qué puedo ayudarte?","type":"text"}'
Test-Endpoint "Messages" "Send Message" "POST" "/messages/send" @{Authorization="Bearer $agentToken"} $sendMessageBody

# Test 5.3: Marcar mensaje como leído
Test-Endpoint "Messages" "Mark as Read" "PATCH" "/messages/1/read" @{Authorization="Bearer $agentToken"}

# ============================================
# MÓDULO 6: CLIENTES
# ============================================
Write-Host "`n📦 MÓDULO 6: CLIENTES (DEUDORES)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 6.1: Obtener todos los clientes
Test-Endpoint "Clients" "Get All Clients" "GET" "/clients" @{Authorization="Bearer $supervisorToken"}

# Test 6.2: Obtener cliente por ID
Test-Endpoint "Clients" "Get Client by ID" "GET" "/clients/1" @{Authorization="Bearer $agentToken"}

# Test 6.3: Buscar cliente por teléfono
Test-Endpoint "Clients" "Search by Phone" "GET" "/clients/search?phone=573009876544" @{Authorization="Bearer $agentToken"}

# Test 6.4: Actualizar información del cliente
$updateClientBody = '{"debtAmount":4500000,"daysOverdue":65}'
Test-Endpoint "Clients" "Update Client Info" "PATCH" "/clients/1" @{Authorization="Bearer $supervisorToken"} $updateClientBody

# ============================================
# MÓDULO 7: CAMPAÑAS
# ============================================
Write-Host "`n📦 MÓDULO 7: CAMPAÑAS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 7.1: Obtener todas las campañas
Test-Endpoint "Campaigns" "Get All Campaigns" "GET" "/campaigns" @{Authorization="Bearer $supervisorToken"}

# Test 7.2: Obtener campaña por ID
Test-Endpoint "Campaigns" "Get Campaign by ID" "GET" "/campaigns/1" @{Authorization="Bearer $supervisorToken"}

# Test 7.3: Filtrar campañas activas
Test-Endpoint "Campaigns" "Filter Active Campaigns" "GET" "/campaigns?status=active" @{Authorization="Bearer $supervisorToken"}

# Test 7.4: Crear nueva campaña (Admin)
$createCampaignBody = '{"name":"Campaign Test Auto","description":"Test campaign","type":"outbound","status":"active","startDate":"2025-11-18T00:00:00Z","endDate":"2025-12-31T23:59:59Z"}'
Test-Endpoint "Campaigns" "Create Campaign" "POST" "/campaigns" @{Authorization="Bearer $adminToken"} $createCampaignBody

# Test 7.5: Actualizar campaña
$updateCampaignBody = '{"description":"Campaña actualizada por testing"}'
Test-Endpoint "Campaigns" "Update Campaign" "PATCH" "/campaigns/1" @{Authorization="Bearer $adminToken"} $updateCampaignBody

# Test 7.6: Obtener estadísticas de campaña
Test-Endpoint "Campaigns" "Get Campaign Stats" "GET" "/campaigns/1/stats" @{Authorization="Bearer $supervisorToken"}

# ============================================
# MÓDULO 8: REPORTES Y DASHBOARD
# ============================================
Write-Host "`n📦 MÓDULO 8: REPORTES Y DASHBOARD" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 8.1: Dashboard de supervisor
Test-Endpoint "Reports" "Supervisor Dashboard" "GET" "/reports/dashboard" @{Authorization="Bearer $supervisorToken"}

# Test 8.2: Métricas de agentes
Test-Endpoint "Reports" "Agent Metrics" "GET" "/reports/agents" @{Authorization="Bearer $supervisorToken"}

# Test 8.3: Reportes por fecha
$today = Get-Date -Format "yyyy-MM-dd"
Test-Endpoint "Reports" "Reports by Date" "GET" "/reports/daily?date=$today" @{Authorization="Bearer $supervisorToken"}

# Test 8.4: Estadísticas de chats
Test-Endpoint "Reports" "Chat Statistics" "GET" "/reports/chats" @{Authorization="Bearer $supervisorToken"}

# ============================================
# MÓDULO 9: WHATSAPP
# ============================================
Write-Host "`n📦 MÓDULO 9: WHATSAPP" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 9.1: Obtener estado de WhatsApp
Test-Endpoint "WhatsApp" "Get Status" "GET" "/whatsapp/status" @{Authorization="Bearer $adminToken"}

# Test 9.2: Obtener QR para conexión
Test-Endpoint "WhatsApp" "Get QR Code" "GET" "/whatsapp/qr" @{Authorization="Bearer $adminToken"}

# Test 9.3: Verificar conexión
Test-Endpoint "WhatsApp" "Check Connection" "GET" "/whatsapp/check" @{Authorization="Bearer $adminToken"}

# ============================================
# MÓDULO 10: TAREAS
# ============================================
Write-Host "`n📦 MÓDULO 10: TAREAS (TASKS)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# Test 10.1: Obtener todas las tareas
Test-Endpoint "Tasks" "Get All Tasks" "GET" "/tasks" @{Authorization="Bearer $agentToken"}

# Test 10.2: Obtener tareas del agente
Test-Endpoint "Tasks" "Get My Tasks" "GET" "/tasks/my-tasks" @{Authorization="Bearer $agentToken"}

# Test 10.3: Crear nueva tarea
$createTaskBody = '{"title":"Llamar cliente","description":"Seguimiento","dueDate":"2025-11-20T10:00:00Z","priority":"high","status":"pending","relatedChatId":"1"}'
Test-Endpoint "Tasks" "Create Task" "POST" "/tasks" @{Authorization="Bearer $agentToken"} $createTaskBody

# ============================================
# RESUMEN DE RESULTADOS
# ============================================
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "              RESUMEN DE TESTING                       " -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)

Write-Host "Total de Pruebas: $totalTests" -ForegroundColor White
Write-Host "Pruebas Exitosas: $passedTests" -ForegroundColor Green
Write-Host "Pruebas Fallidas: $failedTests" -ForegroundColor Red
$successText = "$successRate" + "%"
Write-Host "Tasa de Exito: $successText" -ForegroundColor $(if($successRate -ge 80){"Green"}else{"Yellow"})

Write-Host "`nRESULTADOS POR MODULO:" -ForegroundColor Cyan
$testResults | Group-Object Module | ForEach-Object {
    $moduleName = $_.Name
    $moduleTotal = $_.Count
    $modulePassed = ($_.Group | Where-Object { $_.Status -eq "PASS" }).Count
    $moduleRate = [math]::Round(($modulePassed / $moduleTotal) * 100, 2)
    
    $color = if($moduleRate -eq 100){"Green"}elseif($moduleRate -ge 80){"Yellow"}else{"Red"}
    $rateText = "$moduleRate" + "%"
    Write-Host "  $moduleName : $modulePassed/$moduleTotal ($rateText)" -ForegroundColor $color
}

Write-Host "`nPRUEBAS FALLIDAS:" -ForegroundColor Red
$failedResults = $testResults | Where-Object { $_.Status -eq "FAIL" }
if ($failedResults.Count -eq 0) {
    Write-Host "  Ninguna! Todos los tests pasaron" -ForegroundColor Green
} else {
    $failedResults | ForEach-Object {
        Write-Host "  [$($_.Module)] $($_.Test) - Status: $($_.StatusCode)" -ForegroundColor Red
        Write-Host "    Error: $($_.Message)" -ForegroundColor DarkGray
    }
}

Write-Host "`n✅ Repositorio: https://github.com/sanalejo720/crm-bot-ngso" -ForegroundColor Cyan
$currentDate = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
Write-Host "📅 Fecha: $currentDate" -ForegroundColor White
Write-Host ""
