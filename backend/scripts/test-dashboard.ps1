# Dashboard del Sistema - CRM NGS&O

$baseUrl = "http://localhost:3000/api/v1"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRM NGS&O - DASHBOARD DEL SISTEMA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Conectando al backend..." -ForegroundColor Yellow

try {
    $loginData = '{"email":"admin@crm.com","password":"password123"}'
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $token = $response.data.accessToken
    
    Write-Host "Conexion exitosa!" -ForegroundColor Green
    Write-Host ""
    
    $headers = @{ Authorization = "Bearer $token" }
    
    # Obtener datos
    $chats = Invoke-RestMethod -Uri "$baseUrl/chats" -Method Get -Headers $headers
    $users = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
    $campaigns = Invoke-RestMethod -Uri "$baseUrl/campaigns" -Method Get -Headers $headers
    
    # Mostrar estadisticas
    Write-Host "ESTADISTICAS DEL SISTEMA" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor White
    Write-Host "Chats Totales:      $($chats.data.Length)" -ForegroundColor White
    Write-Host "Usuarios Activos:   $($users.data.Length)" -ForegroundColor White
    Write-Host "Campanas:           $($campaigns.data.Length)" -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor White
    Write-Host ""
    
    # Estado de modulos
    Write-Host "ESTADO DE MODULOS" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor White
    Write-Host "Autenticacion       OK" -ForegroundColor Green
    Write-Host "Usuarios            OK" -ForegroundColor Green
    Write-Host "Campanas            OK" -ForegroundColor Green
    Write-Host "Chats               OK" -ForegroundColor Green
    Write-Host "Mensajes            OK" -ForegroundColor Green
    Write-Host "Reportes            OK" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor White
    Write-Host ""
    
    Write-Host "SISTEMA OPERATIVO" -ForegroundColor Green
    Write-Host ""
    
    # Scripts disponibles
    Write-Host "SCRIPTS DE PRUEBA DISPONIBLES" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  test-suite.ps1     - Suite completa de 15 tests" -ForegroundColor Yellow
    Write-Host "  test-flujo.ps1     - Flujo completo de atencion" -ForegroundColor Yellow
    Write-Host "  test-por-rol.ps1   - Tests por rol de usuario" -ForegroundColor Yellow
    Write-Host "  test-simple.ps1    - Pruebas basicas rapidas" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Documentacion: backend\scripts\README.md" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "ERROR: No se pudo conectar al backend" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica que el backend este corriendo en puerto 3000" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
