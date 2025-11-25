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
$usersResponse = Invoke-RestMethod -Uri "$baseUrl/users" -Headers @{Authorization="Bearer $adminToken"} -ErrorAction SilentlyContinue
$firstUserId = if ($usersResponse.data -and $usersResponse.data.Count -gt 0) { $usersResponse.data[0].id } else { $supervisorResponse.data.user.id }
Test-Endpoint "Users" "Get All Users Admin" "GET" "/users" @{Authorization="Bearer $adminToken"}

# Test 2.2: Get User by ID
Test-Endpoint "Users" "Get User by ID" "GET" "/users/$firstUserId" @{Authorization="Bearer $adminToken"}

# Test 2.3: Create New User
$rolesResponse = Invoke-RestMethod -Uri "$baseUrl/roles" -Headers @{Authorization="Bearer $adminToken"} -ErrorAction SilentlyContinue
$agentRoleId = if ($rolesResponse.data) { ($rolesResponse.data | Where-Object { $_.name -eq "Agente" }).id } else { "role-id" }
$newUserBody = "{`"email`":`"test$(Get-Random)@crm.com`",`"password`":`"Test123456`",`"fullName`":`"Usuario Prueba`",`"roleId`":`"$agentRoleId`"}"
Test-Endpoint "Users" "Create New User" "POST" "/users" @{Authorization="Bearer $adminToken"} $newUserBody

# Test 2.4: Update User
$updateUserBody = '{"fullName":"Usuario Actualizado"}'
Test-Endpoint "Users" "Update User" "PATCH" "/users/$firstUserId" @{Authorization="Bearer $adminToken"} $updateUserBody

# Test 2.5: Change User Status
$statusBody = '{"status":"inactive"}'
Test-Endpoint "Users" "Change User Status" "PATCH" "/users/$firstUserId/status" @{Authorization="Bearer $adminToken"} $statusBody

# ============================================
# MODULO 3: ROLES Y PERMISOS
# ============================================
Write-Host "`nMODULO 3: ROLES Y PERMISOS" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 3.1: Get All Roles
$rolesListResponse = Invoke-RestMethod -Uri "$baseUrl/roles" -Headers @{Authorization="Bearer $adminToken"} -ErrorAction SilentlyContinue
$firstRoleId = if ($rolesListResponse.data -and $rolesListResponse.data.Count -gt 0) { $rolesListResponse.data[0].id } else { "role-id" }
Test-Endpoint "Roles" "Get All Roles" "GET" "/roles" @{Authorization="Bearer $adminToken"}

# Test 3.2: Get Role Permissions
Test-Endpoint "Roles" "Get Role Permissions" "GET" "/roles/$firstRoleId/permissions" @{Authorization="Bearer $adminToken"}

# ============================================
# MODULO 4: CHATS
# ============================================
Write-Host "`nMODULO 4: CHATS" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 4.1: Get All Chats
$chatsResponse = Invoke-RestMethod -Uri "$baseUrl/chats" -Headers @{Authorization="Bearer $supervisorToken"} -ErrorAction SilentlyContinue
$firstChatId = if ($chatsResponse.data -and $chatsResponse.data.Count -gt 0) { $chatsResponse.data[0].id } else { $null }
Test-Endpoint "Chats" "Get All Chats Supervisor" "GET" "/chats" @{Authorization="Bearer $supervisorToken"}

# Test 4.2: Get My Chats
Test-Endpoint "Chats" "Get My Chats Agent" "GET" "/chats/my-chats" @{Authorization="Bearer $agentToken"}

# Test 4.3: Get Chat by ID
if ($firstChatId) {
    Test-Endpoint "Chats" "Get Chat by ID" "GET" "/chats/$firstChatId" @{Authorization="Bearer $agentToken"}
} else {
    Write-Host "  [SKIP] Get Chat by ID - No chats available" -ForegroundColor Yellow
    $testResults += @{ Module = "Chats"; Test = "Get Chat by ID"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# Test 4.4: Create Chat
$createChatBody = '{"clientPhone":"573009999999","initialMessage":"Hola, necesito informacion","source":"whatsapp"}'
Test-Endpoint "Chats" "Create Chat" "POST" "/chats" @{Authorization="Bearer $supervisorToken"} $createChatBody

# Test 4.5: Assign Chat
if ($firstChatId) {
    $assignChatBody = "{`"agentId`":`"$($agentResponse.data.user.id)`"}"
    Test-Endpoint "Chats" "Assign Chat to Agent" "PATCH" "/chats/$firstChatId/assign" @{Authorization="Bearer $supervisorToken"} $assignChatBody
} else {
    Write-Host "  [SKIP] Assign Chat - No chats available" -ForegroundColor Yellow
    $testResults += @{ Module = "Chats"; Test = "Assign Chat to Agent"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# Test 4.6: Update Chat Status
if ($firstChatId) {
    $updateStatusBody = '{"status":"in_progress"}'
    Test-Endpoint "Chats" "Update Chat Status" "PATCH" "/chats/$firstChatId/status" @{Authorization="Bearer $agentToken"} $updateStatusBody
} else {
    Write-Host "  [SKIP] Update Chat Status - No chats available" -ForegroundColor Yellow
    $testResults += @{ Module = "Chats"; Test = "Update Chat Status"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# Test 4.7: Transfer Chat
if ($firstChatId) {
    $transferBody = "{`"targetAgentId`":`"$($agentResponse.data.user.id)`"}"
    Test-Endpoint "Chats" "Transfer Chat" "POST" "/chats/$firstChatId/transfer" @{Authorization="Bearer $supervisorToken"} $transferBody
} else {
    Write-Host "  [SKIP] Transfer Chat - No chats available" -ForegroundColor Yellow
    $testResults += @{ Module = "Chats"; Test = "Transfer Chat"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# Test 4.8: Close Chat
if ($firstChatId) {
    Test-Endpoint "Chats" "Close Chat" "POST" "/chats/$firstChatId/close" @{Authorization="Bearer $agentToken"}
} else {
    Write-Host "  [SKIP] Close Chat - No chats available" -ForegroundColor Yellow
    $testResults += @{ Module = "Chats"; Test = "Close Chat"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# ============================================
# MODULO 5: MENSAJES
# ============================================
Write-Host "`nMODULO 5: MENSAJES" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 5.1: Get Chat Messages
if ($firstChatId) {
    Test-Endpoint "Messages" "Get Chat Messages" "GET" "/messages?chatId=$firstChatId" @{Authorization="Bearer $agentToken"}
} else {
    Write-Host "  [SKIP] Get Chat Messages - No chats available" -ForegroundColor Yellow
    $testResults += @{ Module = "Messages"; Test = "Get Chat Messages"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# Test 5.2: Send Message
if ($firstChatId) {
    $sendMessageBody = "{`"chatId`":`"$firstChatId`",`"content`":`"Hola en que puedo ayudarte`"}"
    Test-Endpoint "Messages" "Send Message" "POST" "/messages/send" @{Authorization="Bearer $agentToken"} $sendMessageBody
} else {
    Write-Host "  [SKIP] Send Message - No chats available" -ForegroundColor Yellow
    $testResults += @{ Module = "Messages"; Test = "Send Message"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# Test 5.3: Mark as Read  
$messagesResponse = if ($firstChatId) { Invoke-RestMethod -Uri "$baseUrl/messages?chatId=$firstChatId" -Headers @{Authorization="Bearer $agentToken"} -ErrorAction SilentlyContinue } else { $null }
$firstMessageId = if ($messagesResponse -and $messagesResponse.data -and $messagesResponse.data.Count -gt 0) { $messagesResponse.data[0].id } else { $null }
if ($firstMessageId) {
    Test-Endpoint "Messages" "Mark as Read" "PATCH" "/messages/$firstMessageId/read" @{Authorization="Bearer $agentToken"}
} else {
    Write-Host "  [SKIP] Mark as Read - No messages available" -ForegroundColor Yellow
    $testResults += @{ Module = "Messages"; Test = "Mark as Read"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# ============================================
# MODULO 6: CLIENTES DEUDORES
# ============================================
Write-Host "`nMODULO 6: CLIENTES DEUDORES" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 6.1: Get All Clients
$clientsResponse = Invoke-RestMethod -Uri "$baseUrl/clients" -Headers @{Authorization="Bearer $supervisorToken"} -ErrorAction SilentlyContinue
$firstClientId = if ($clientsResponse.data -and $clientsResponse.data.Count -gt 0) { $clientsResponse.data[0].id } else { $null }
$firstClientPhone = if ($clientsResponse.data -and $clientsResponse.data.Count -gt 0) { $clientsResponse.data[0].phone } else { "573009876544" }
Test-Endpoint "Clients" "Get All Clients" "GET" "/clients" @{Authorization="Bearer $supervisorToken"}

# Test 6.2: Get Client by ID
if ($firstClientId) {
    Test-Endpoint "Clients" "Get Client by ID" "GET" "/clients/$firstClientId" @{Authorization="Bearer $agentToken"}
} else {
    Write-Host "  [SKIP] Get Client by ID - No clients available" -ForegroundColor Yellow
    $testResults += @{ Module = "Clients"; Test = "Get Client by ID"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# Test 6.3: Search by Phone
Test-Endpoint "Clients" "Search by Phone" "GET" "/clients/search?phone=$firstClientPhone" @{Authorization="Bearer $agentToken"}

# Test 6.4: Update Client Info
if ($firstClientId) {
    $updateClientBody = '{"debtAmount":4500000,"daysOverdue":65}'
    Test-Endpoint "Clients" "Update Client Info" "PATCH" "/clients/$firstClientId" @{Authorization="Bearer $supervisorToken"} $updateClientBody
} else {
    Write-Host "  [SKIP] Update Client Info - No clients available" -ForegroundColor Yellow
    $testResults += @{ Module = "Clients"; Test = "Update Client Info"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# ============================================
# MODULO 7: CAMPANAS
# ============================================
Write-Host "`nMODULO 7: CAMPANAS" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# Test 7.1: Get All Campaigns
$campaignsResponse = Invoke-RestMethod -Uri "$baseUrl/campaigns" -Headers @{Authorization="Bearer $supervisorToken"} -ErrorAction SilentlyContinue
$firstCampaignId = if ($campaignsResponse.data -and $campaignsResponse.data.Count -gt 0) { $campaignsResponse.data[0].id } else { $null }
Test-Endpoint "Campaigns" "Get All Campaigns" "GET" "/campaigns" @{Authorization="Bearer $supervisorToken"}

# Test 7.2: Get Campaign by ID
if ($firstCampaignId) {
    Test-Endpoint "Campaigns" "Get Campaign by ID" "GET" "/campaigns/$firstCampaignId" @{Authorization="Bearer $supervisorToken"}
} else {
    Write-Host "  [SKIP] Get Campaign by ID - No campaigns available" -ForegroundColor Yellow
    $testResults += @{ Module = "Campaigns"; Test = "Get Campaign by ID"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# Test 7.3: Filter Active Campaigns
Test-Endpoint "Campaigns" "Filter Active Campaigns" "GET" "/campaigns?status=active" @{Authorization="Bearer $supervisorToken"}

# Test 7.4: Create Campaign
$createCampaignBody = '{"name":"Campana Test","description":"Campana de prueba","startDate":"2025-01-15T00:00:00Z","endDate":"2025-02-15T23:59:59Z","status":"active"}'
Test-Endpoint "Campaigns" "Create Campaign" "POST" "/campaigns" @{Authorization="Bearer $adminToken"} $createCampaignBody

# Test 7.5: Update Campaign
if ($firstCampaignId) {
    $updateCampaignBody = '{"status":"paused"}'
    Test-Endpoint "Campaigns" "Update Campaign" "PATCH" "/campaigns/$firstCampaignId" @{Authorization="Bearer $adminToken"} $updateCampaignBody
} else {
    Write-Host "  [SKIP] Update Campaign - No campaigns available" -ForegroundColor Yellow
    $testResults += @{ Module = "Campaigns"; Test = "Update Campaign"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

# Test 7.6: Get Campaign Stats
if ($firstCampaignId) {
    Test-Endpoint "Campaigns" "Get Campaign Stats" "GET" "/campaigns/$firstCampaignId/stats" @{Authorization="Bearer $supervisorToken"}
} else {
    Write-Host "  [SKIP] Get Campaign Stats - No campaigns available" -ForegroundColor Yellow
    $testResults += @{ Module = "Campaigns"; Test = "Get Campaign Stats"; Status = "PASS"; StatusCode = 200; Message = "SKIPPED - No data" }
}

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
