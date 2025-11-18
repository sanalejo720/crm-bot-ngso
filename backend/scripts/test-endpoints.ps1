# ============================================
# TESTING COMPLETO - NGSO CRM v1.0.0
# ============================================

$baseUrl = "http://localhost:3000/api/v1"
$testResults = @()

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
        $url = "$baseUrl$Endpoint"
        $params = @{
            Uri = $url
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
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "     TESTING COMPLETO - NGSO CRM v1.0.0" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# ============================================
# MODULO 1: AUTENTICACION
# ============================================
Write-Host "`nMODULO 1: AUTENTICACION" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 1.1: Login Super Admin
$loginBody = '{"email":"admin@crm.com","password":"password123"}'
try {
    $adminResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    $adminToken = $adminResponse.data.accessToken
    Test-Endpoint "Auth" "Login Super Admin" "POST" "/auth/login" @{} $loginBody
} catch {
    Write-Host "  [FAIL] Login Super Admin - Could not retrieve token" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor DarkGray
    exit 1
}

# Test 1.2: Login Supervisor  
$supervisorBody = '{"email":"juan@crm.com","password":"password123"}'
try {
    $supervisorResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $supervisorBody -ContentType "application/json" -ErrorAction Stop
    $supervisorToken = $supervisorResponse.data.accessToken
    Test-Endpoint "Auth" "Login Supervisor" "POST" "/auth/login" @{} $supervisorBody
} catch {
    Write-Host "  [FAIL] Login Supervisor - Could not retrieve token" -ForegroundColor Red
}

# Test 1.3: Login Agente
$agentBody = '{"email":"laura@crm.com","password":"password123"}'
try {
    $agentResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $agentBody -ContentType "application/json" -ErrorAction Stop
    $agentToken = $agentResponse.data.accessToken
    Test-Endpoint "Auth" "Login Agente" "POST" "/auth/login" @{} $agentBody
} catch {
    Write-Host "  [FAIL] Login Agente - Could not retrieve token" -ForegroundColor Red
}

# Test 1.4: Get Profile
Test-Endpoint "Auth" "Get Profile" "GET" "/auth/me" @{Authorization="Bearer $adminToken"}

# Test 1.5: Refresh Token
$refreshBody = "{`"refreshToken`":`"$($adminResponse.refreshToken)`"}"
Test-Endpoint "Auth" "Refresh Token" "POST" "/auth/refresh" @{} $refreshBody

# ============================================
# MODULO 2: USUARIOS
# ============================================
Write-Host "`nMODULO 2: USUARIOS" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 2.1: Get All Users
Test-Endpoint "Users" "Get All Users Admin" "GET" "/users" @{Authorization="Bearer $adminToken"}

# Test 2.2: Get User by ID
Test-Endpoint "Users" "Get User by ID" "GET" "/users/1" @{Authorization="Bearer $adminToken"}

# Test 2.3: Create New User
$newUserBody = '{"email":"test@crm.com","password":"Test123","firstName":"Usuario","lastName":"Prueba","roleId":"1"}'
Test-Endpoint "Users" "Create New User" "POST" "/users" @{Authorization="Bearer $adminToken"} $newUserBody

# Test 2.4: Update User
$updateUserBody = '{"firstName":"Usuario Actualizado"}'
Test-Endpoint "Users" "Update User" "PATCH" "/users/1" @{Authorization="Bearer $adminToken"} $updateUserBody

# Test 2.5: Change User Status
Test-Endpoint "Users" "Change User Status" "PATCH" "/users/1/status" @{Authorization="Bearer $adminToken"}

# ============================================
# MODULO 3: ROLES Y PERMISOS
# ============================================
Write-Host "`nMODULO 3: ROLES Y PERMISOS" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 3.1: Get All Roles
Test-Endpoint "Roles" "Get All Roles" "GET" "/roles" @{Authorization="Bearer $adminToken"}

# Test 3.2: Get Role Permissions
Test-Endpoint "Roles" "Get Role Permissions" "GET" "/roles/1/permissions" @{Authorization="Bearer $adminToken"}

# ============================================
# MODULO 4: CHATS
# ============================================
Write-Host "`nMODULO 4: CHATS" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 4.1: Get All Chats
Test-Endpoint "Chats" "Get All Chats Supervisor" "GET" "/chats" @{Authorization="Bearer $supervisorToken"}

# Test 4.2: Get My Chats
Test-Endpoint "Chats" "Get My Chats Agent" "GET" "/chats/my-chats" @{Authorization="Bearer $agentToken"}

# Test 4.3: Get Chat by ID
Test-Endpoint "Chats" "Get Chat by ID" "GET" "/chats/1" @{Authorization="Bearer $agentToken"}

# Test 4.4: Create Chat
$createChatBody = '{"clientPhone":"573009999999","initialMessage":"Hola, necesito informacion","source":"whatsapp"}'
Test-Endpoint "Chats" "Create Chat" "POST" "/chats" @{Authorization="Bearer $supervisorToken"} $createChatBody

# Test 4.5: Assign Chat
$assignChatBody = "{`"agentId`":`"$($agentResponse.user.id)`"}"
Test-Endpoint "Chats" "Assign Chat to Agent" "PATCH" "/chats/1/assign" @{Authorization="Bearer $supervisorToken"} $assignChatBody

# Test 4.6: Update Chat Status
$updateStatusBody = '{"status":"in_progress"}'
Test-Endpoint "Chats" "Update Chat Status" "PATCH" "/chats/1/status" @{Authorization="Bearer $agentToken"} $updateStatusBody

# Test 4.7: Transfer Chat
$transferBody = "{`"targetAgentId`":`"$($agentResponse.user.id)`"}"
Test-Endpoint "Chats" "Transfer Chat" "POST" "/chats/1/transfer" @{Authorization="Bearer $supervisorToken"} $transferBody

# Test 4.8: Close Chat
Test-Endpoint "Chats" "Close Chat" "POST" "/chats/1/close" @{Authorization="Bearer $agentToken"}

# ============================================
# MODULO 5: MENSAJES
# ============================================
Write-Host "`nMODULO 5: MENSAJES" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 5.1: Get Chat Messages
Test-Endpoint "Messages" "Get Chat Messages" "GET" "/messages?chatId=1" @{Authorization="Bearer $agentToken"}

# Test 5.2: Send Message
$sendMessageBody = '{"chatId":1,"text":"Hola en que puedo ayudarte","type":"text"}'
Test-Endpoint "Messages" "Send Message" "POST" "/messages/send" @{Authorization="Bearer $agentToken"} $sendMessageBody

# Test 5.3: Mark as Read
Test-Endpoint "Messages" "Mark as Read" "PATCH" "/messages/1/read" @{Authorization="Bearer $agentToken"}

# ============================================
# MODULO 6: CLIENTES DEUDORES
# ============================================
Write-Host "`nMODULO 6: CLIENTES DEUDORES" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 6.1: Get All Clients
Test-Endpoint "Clients" "Get All Clients" "GET" "/clients" @{Authorization="Bearer $supervisorToken"}

# Test 6.2: Get Client by ID
Test-Endpoint "Clients" "Get Client by ID" "GET" "/clients/1" @{Authorization="Bearer $agentToken"}

# Test 6.3: Search by Phone
Test-Endpoint "Clients" "Search by Phone" "GET" "/clients/search?phone=573009876544" @{Authorization="Bearer $agentToken"}

# Test 6.4: Update Client Info
$updateClientBody = '{"debtAmount":4500000,"daysOverdue":65}'
Test-Endpoint "Clients" "Update Client Info" "PATCH" "/clients/1" @{Authorization="Bearer $supervisorToken"} $updateClientBody

# ============================================
# MODULO 7: CAMPANAS
# ============================================
Write-Host "`nMODULO 7: CAMPANAS" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 7.1: Get All Campaigns
Test-Endpoint "Campaigns" "Get All Campaigns" "GET" "/campaigns" @{Authorization="Bearer $supervisorToken"}

# Test 7.2: Get Campaign by ID
Test-Endpoint "Campaigns" "Get Campaign by ID" "GET" "/campaigns/1" @{Authorization="Bearer $supervisorToken"}

# Test 7.3: Filter Active Campaigns
Test-Endpoint "Campaigns" "Filter Active Campaigns" "GET" "/campaigns?status=active" @{Authorization="Bearer $supervisorToken"}

# Test 7.4: Create Campaign
$createCampaignBody = '{"name":"Campana Test","description":"Campana de prueba","startDate":"2025-01-15T00:00:00Z","endDate":"2025-02-15T23:59:59Z","status":"active"}'
Test-Endpoint "Campaigns" "Create Campaign" "POST" "/campaigns" @{Authorization="Bearer $adminToken"} $createCampaignBody

# Test 7.5: Update Campaign
$updateCampaignBody = '{"status":"paused"}'
Test-Endpoint "Campaigns" "Update Campaign" "PATCH" "/campaigns/1" @{Authorization="Bearer $adminToken"} $updateCampaignBody

# Test 7.6: Get Campaign Stats
Test-Endpoint "Campaigns" "Get Campaign Stats" "GET" "/campaigns/1/stats" @{Authorization="Bearer $supervisorToken"}

# ============================================
# MODULO 8: REPORTES Y DASHBOARD
# ============================================
Write-Host "`nMODULO 8: REPORTES Y DASHBOARD" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 8.1: Supervisor Dashboard
Test-Endpoint "Reports" "Supervisor Dashboard" "GET" "/reports/dashboard" @{Authorization="Bearer $supervisorToken"}

# Test 8.2: Agent Metrics
Test-Endpoint "Reports" "Agent Metrics" "GET" "/reports/agents" @{Authorization="Bearer $supervisorToken"}

# Test 8.3: Reports by Date
$today = Get-Date -Format "yyyy-MM-dd"
Test-Endpoint "Reports" "Reports by Date" "GET" "/reports/daily?date=$today" @{Authorization="Bearer $supervisorToken"}

# Test 8.4: Chat Statistics
Test-Endpoint "Reports" "Chat Statistics" "GET" "/reports/chats" @{Authorization="Bearer $supervisorToken"}

# ============================================
# MODULO 9: WHATSAPP
# ============================================
Write-Host "`nMODULO 9: WHATSAPP" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 9.1: Get Status
Test-Endpoint "WhatsApp" "Get Status" "GET" "/whatsapp/status" @{Authorization="Bearer $adminToken"}

# Test 9.2: Get QR Code
Test-Endpoint "WhatsApp" "Get QR Code" "GET" "/whatsapp/qr" @{Authorization="Bearer $adminToken"}

# Test 9.3: Check Connection
Test-Endpoint "WhatsApp" "Check Connection" "GET" "/whatsapp/check" @{Authorization="Bearer $adminToken"}

# ============================================
# MODULO 10: TAREAS TASKS
# ============================================
Write-Host "`nMODULO 10: TAREAS TASKS" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 10.1: Get All Tasks
Test-Endpoint "Tasks" "Get All Tasks" "GET" "/tasks" @{Authorization="Bearer $agentToken"}

# Test 10.2: Get My Tasks
Test-Endpoint "Tasks" "Get My Tasks" "GET" "/tasks/my-tasks" @{Authorization="Bearer $agentToken"}

# Test 10.3: Create Task
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

if ($totalTests -gt 0) {
    $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
} else {
    $successRate = 0
}

Write-Host "Total de Pruebas: $totalTests" -ForegroundColor White
Write-Host "Pruebas Exitosas: $passedTests" -ForegroundColor Green
Write-Host "Pruebas Fallidas: $failedTests" -ForegroundColor Red
Write-Host "Tasa de Exito: $successRate%" -ForegroundColor $(if($successRate -ge 80){"Green"}else{"Yellow"})

Write-Host "`nRESULTADOS POR MODULO:" -ForegroundColor Cyan
$testResults | Group-Object Module | ForEach-Object {
    $moduleName = $_.Name
    $moduleTotal = $_.Count
    $modulePassed = ($_.Group | Where-Object { $_.Status -eq "PASS" }).Count
    
    if ($moduleTotal -gt 0) {
        $moduleRate = [math]::Round(($modulePassed / $moduleTotal) * 100, 2)
        $color = if($moduleRate -eq 100){"Green"}elseif($moduleRate -ge 80){"Yellow"}else{"Red"}
        Write-Host "  $moduleName : $modulePassed/$moduleTotal ($moduleRate%)" -ForegroundColor $color
    }
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

Write-Host "`nRepositorio: https://github.com/sanalejo720/crm-bot-ngso" -ForegroundColor Cyan
$timestamp = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
Write-Host "Fecha: $timestamp" -ForegroundColor DarkGray
Write-Host "`n============================================================`n" -ForegroundColor Cyan
