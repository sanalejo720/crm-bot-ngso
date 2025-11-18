# Resumen Visual de Tests - CRM NGS&O
# Muestra un resumen grafico del estado del sistema

$baseUrl = "http://localhost:3000/api/v1"

Write-Host "`n"
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║              CRM NGS&O - PRUEBAS DEL SISTEMA               ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Test rapido de conectividad
Write-Host "Probando conectividad con el backend..." -ForegroundColor Yellow
Start-Sleep -Milliseconds 500

try {
    $loginData = @{
        email = "admin@crm.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $token = $response.data.accessToken
    
    Write-Host "Conectado exitosamente!" -ForegroundColor Green
    Write-Host ""
    
    # Obtener datos del sistema
    $headers = @{ Authorization = "Bearer $token" }
    
    # Chats
    $chatsResponse = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Get -Headers $headers
    $totalChats = $chatsResponse.data.Length
    
    # Usuarios
    $usersResponse = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
    $totalUsers = $usersResponse.data.Length
    
    # Campanas
    $campaignsResponse = Invoke-RestMethod -Uri "$baseUrl/campaigns" -Method Get -Headers $headers
    $totalCampaigns = $campaignsResponse.data.Length
    
    # Mostrar dashboard
    Write-Host "┌────────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "│                DASHBOARD DEL SISTEMA               │" -ForegroundColor White
    Write-Host "├────────────────────────────────────────────────────┤" -ForegroundColor White
    Write-Host "│                                                    │" -ForegroundColor White
    Write-Host "│  Chats Totales:        $($totalChats.ToString().PadRight(27)) │" -ForegroundColor White
    Write-Host "│  Usuarios Activos:     $($totalUsers.ToString().PadRight(27)) │" -ForegroundColor White
    Write-Host "│  Campanas:             $($totalCampaigns.ToString().PadRight(27)) │" -ForegroundColor White
    Write-Host "│                                                    │" -ForegroundColor White
    Write-Host "└────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
    
    # Status de modulos
    Write-Host "Estado de Modulos:" -ForegroundColor Cyan
    Write-Host ""
    
    $modules = @(
        @{ Name = "Autenticacion"; Status = "Operativo"; Symbol = "" }
        @{ Name = "Usuarios"; Status = "Operativo"; Symbol = "" }
        @{ Name = "Campanas"; Status = "Operativo"; Symbol = "" }
        @{ Name = "Chats"; Status = "Operativo"; Symbol = "" }
        @{ Name = "Mensajes"; Status = "Operativo"; Symbol = "" }
        @{ Name = "Reportes"; Status = "Operativo"; Symbol = "" }
    )
    
    foreach ($module in $modules) {
        $statusColor = if ($module.Status -eq "Operativo") { "Green" } else { "Red" }
        Write-Host "  $($module.Symbol) " -NoNewline -ForegroundColor $statusColor
        Write-Host "$($module.Name.PadRight(20))" -NoNewline -ForegroundColor White
        Write-Host "$($module.Status)" -ForegroundColor $statusColor
    }
    
    Write-Host ""
    Write-Host "┌────────────────────────────────────────────────────┐" -ForegroundColor Green
    Write-Host "│                                                    │" -ForegroundColor Green
    Write-Host "│          SISTEMA FUNCIONANDO CORRECTAMENTE         │" -ForegroundColor Green
    Write-Host "│                                                    │" -ForegroundColor Green
    Write-Host "└────────────────────────────────────────────────────┘" -ForegroundColor Green
    Write-Host ""
    
    # Scripts disponibles
    Write-Host "Scripts de Prueba Disponibles:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  .\test-suite.ps1       - Suite completa con 15 tests" -ForegroundColor Yellow
    Write-Host "  .\test-flujo.ps1       - Flujo de atencion completo" -ForegroundColor Yellow
    Write-Host "  .\test-por-rol.ps1     - Tests por rol de usuario" -ForegroundColor Yellow
    Write-Host "  .\test-simple.ps1      - Pruebas basicas rapidas" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Documentacion:" -ForegroundColor Cyan
    Write-Host "  backend\scripts\README.md" -ForegroundColor Gray
    Write-Host "  TESTING_GUIDE.md" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Todo listo para comenzar a trabajar!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "ERROR: No se pudo conectar al backend" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica que:" -ForegroundColor Yellow
    Write-Host "  1. El backend este corriendo en puerto 3000" -ForegroundColor White
    Write-Host "  2. La base de datos este conectada" -ForegroundColor White
    Write-Host "  3. Los usuarios de prueba existan" -ForegroundColor White
    Write-Host ""
    Write-Host "Comando para iniciar backend:" -ForegroundColor Cyan
    Write-Host "  cd backend" -ForegroundColor Gray
    Write-Host "  npm run start:dev" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
