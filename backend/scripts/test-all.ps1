# =====================================================
# SCRIPT MAESTRO DE PRUEBAS - TODOS LOS MÓDULOS
# NGS&O CRM Gestión - Desarrollado por AS Software
# =====================================================

$baseUrl = "http://localhost:3000/api/v1"

Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "║      NGS&O CRM GESTIÓN - TEST SUITE COMPLETO      ║" -ForegroundColor Cyan
Write-Host "║          Desarrollado por AS Software             ║" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# =====================================================
# VERIFICAR QUE EL BACKEND ESTÉ CORRIENDO
# =====================================================
Write-Host "🔍 Verificando disponibilidad del backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post `
        -ContentType "application/json" -Body '{"email":"test","password":"test"}' -ErrorAction SilentlyContinue
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Backend disponible en $baseUrl`n" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend no disponible. Asegúrate de que esté corriendo en $baseUrl" -ForegroundColor Red
        exit 1
    }
}

Start-Sleep -Seconds 1

# =====================================================
# VARIABLES PARA TRACKING
# =====================================================
$Global:TestResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Skipped = 0
}

$Global:StartTime = Get-Date

# =====================================================
# FUNCIÓN PARA EJECUTAR SCRIPT Y CONTAR RESULTADOS
# =====================================================
function Run-TestScript {
    param (
        [string]$ScriptPath,
        [string]$ModuleName
    )
    
    Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║  EJECUTANDO PRUEBAS: $($ModuleName.PadRight(32)) ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Magenta
    
    $moduleStartTime = Get-Date
    
    try {
        & $ScriptPath
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0 -or $null -eq $exitCode) {
            $Global:TestResults.Passed++
            Write-Host "`n✅ Módulo $ModuleName completado exitosamente" -ForegroundColor Green
        } else {
            $Global:TestResults.Failed++
            Write-Host "`n⚠️ Módulo $ModuleName completado con errores" -ForegroundColor Yellow
        }
    } catch {
        $Global:TestResults.Failed++
        Write-Host "`n❌ Error ejecutando $ModuleName : $($_.Exception.Message)" -ForegroundColor Red
    }
    
    $Global:TestResults.Total++
    
    $moduleEndTime = Get-Date
    $duration = $moduleEndTime - $moduleStartTime
    Write-Host "⏱️  Duración: $($duration.TotalSeconds.ToString('0.00')) segundos`n" -ForegroundColor Gray
    
    Start-Sleep -Seconds 2
}

# =====================================================
# EJECUTAR TODOS LOS TESTS
# =====================================================

Write-Host "📋 Iniciando suite de pruebas completa...`n" -ForegroundColor Cyan
Start-Sleep -Seconds 1

# AUTH Module
Run-TestScript -ScriptPath "$PSScriptRoot\test-auth.ps1" -ModuleName "AUTH"

# CAMPAIGNS Module
Run-TestScript -ScriptPath "$PSScriptRoot\test-campaigns.ps1" -ModuleName "CAMPAIGNS"

# CHATS Module
Run-TestScript -ScriptPath "$PSScriptRoot\test-chats.ps1" -ModuleName "CHATS"

# MESSAGES Module
Run-TestScript -ScriptPath "$PSScriptRoot\test-messages.ps1" -ModuleName "MESSAGES"

# REPORTS Module
Run-TestScript -ScriptPath "$PSScriptRoot\test-reports.ps1" -ModuleName "REPORTS"

# USERS Module
Run-TestScript -ScriptPath "$PSScriptRoot\test-users.ps1" -ModuleName "USERS"

# =====================================================
# RESUMEN FINAL
# =====================================================
$Global:EndTime = Get-Date
$totalDuration = $Global:EndTime - $Global:StartTime

Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "║              RESUMEN DE PRUEBAS                    ║" -ForegroundColor Cyan
Write-Host "║                                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📊 RESULTADOS:" -ForegroundColor White
Write-Host "   Total de módulos probados: $($Global:TestResults.Total)" -ForegroundColor Gray
Write-Host "   ✅ Exitosos: $($Global:TestResults.Passed)" -ForegroundColor Green
Write-Host "   ❌ Fallidos: $($Global:TestResults.Failed)" -ForegroundColor Red
Write-Host "   ⏭️  Omitidos: $($Global:TestResults.Skipped)" -ForegroundColor Yellow

Write-Host "`n⏱️  TIEMPOS:" -ForegroundColor White
Write-Host "   Inicio: $($Global:StartTime.ToString('HH:mm:ss'))" -ForegroundColor Gray
Write-Host "   Fin: $($Global:EndTime.ToString('HH:mm:ss'))" -ForegroundColor Gray
Write-Host "   Duración total: $($totalDuration.TotalSeconds.ToString('0.00')) segundos" -ForegroundColor Gray

# Calcular porcentaje de éxito
if ($Global:TestResults.Total -gt 0) {
    $successRate = ($Global:TestResults.Passed / $Global:TestResults.Total) * 100
    Write-Host "`n📈 TASA DE ÉXITO: $($successRate.ToString('0.00'))%" -ForegroundColor $(if($successRate -ge 80) { "Green" } elseif($successRate -ge 60) { "Yellow" } else { "Red" })
}

Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         SUITE DE PRUEBAS COMPLETADA               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Retornar código de salida basado en resultados
if ($Global:TestResults.Failed -gt 0) {
    exit 1
} else {
    exit 0
}
