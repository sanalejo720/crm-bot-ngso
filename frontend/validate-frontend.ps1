#!/usr/bin/env pwsh
# Script de Validación Completa del Frontend
# NGS&O CRM Gestión - Desarrollado por Alejandro Sandoval - AS Software

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "VALIDACIÓN COMPLETA DEL FRONTEND" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$frontendPath = "D:\crm-ngso-whatsapp\frontend"
Set-Location $frontendPath

# 1. Verificar que node_modules existe
Write-Host "1. VERIFICANDO DEPENDENCIAS" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow
if (-Not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules no encontrado. Ejecutando npm install..." -ForegroundColor Red
    npm install
} else {
    Write-Host "✓ node_modules encontrado" -ForegroundColor Green
}
Write-Host ""

# 2. Compilación TypeScript (sin emitir archivos)
Write-Host "2. COMPILACIÓN TYPESCRIPT" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow
Write-Host "Ejecutando: npx tsc --noEmit`n" -ForegroundColor Gray
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Sin errores de TypeScript" -ForegroundColor Green
} else {
    Write-Host "❌ Errores de TypeScript encontrados:" -ForegroundColor Red
    Write-Host $tscOutput -ForegroundColor Red
}
Write-Host ""

# 3. Linting con ESLint (si existe)
Write-Host "3. ANÁLISIS DE CÓDIGO (ESLint)" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow
if (Test-Path ".eslintrc.cjs" -or Test-Path ".eslintrc.js" -or Test-Path ".eslintrc.json") {
    Write-Host "Ejecutando: npx eslint src --ext .ts,.tsx`n" -ForegroundColor Gray
    $eslintOutput = npx eslint src --ext .ts,.tsx 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Sin errores de ESLint" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Warnings/Errores de ESLint:" -ForegroundColor Yellow
        Write-Host $eslintOutput -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ ESLint no configurado" -ForegroundColor Yellow
}
Write-Host ""

# 4. Verificar estructura de archivos
Write-Host "4. VERIFICANDO ESTRUCTURA DE ARCHIVOS" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$requiredDirs = @(
    "src/components",
    "src/pages",
    "src/services",
    "src/store",
    "src/store/slices",
    "src/hooks",
    "src/types",
    "src/utils"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "✓ $dir" -ForegroundColor Green
    } else {
        Write-Host "❌ $dir FALTANTE" -ForegroundColor Red
    }
}
Write-Host ""

# 5. Buscar imports incorrectos
Write-Host "5. VALIDANDO IMPORTS" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow
Write-Host "Buscando imports problemáticos...`n" -ForegroundColor Gray

# Buscar imports de 'react' sin type
$reactImports = Get-ChildItem -Path "src" -Recurse -Filter "*.ts*" | 
    Select-String -Pattern "import \{ .*(FormEvent|MouseEvent|ChangeEvent|KeyboardEvent).* \} from ['\`"]react['\`"]" |
    Select-Object -First 10

if ($reactImports) {
    Write-Host "⚠️ Imports de tipos de React sin 'type':" -ForegroundColor Yellow
    foreach ($match in $reactImports) {
        Write-Host "  - $($match.Path):$($match.LineNumber)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Imports de React correctos" -ForegroundColor Green
}

# Buscar imports de @reduxjs/toolkit sin type
$reduxImports = Get-ChildItem -Path "src" -Recurse -Filter "*.ts*" | 
    Select-String -Pattern "import \{ .*(PayloadAction).* \} from ['\`"]@reduxjs/toolkit['\`"]" |
    Select-Object -First 10

if ($reduxImports) {
    Write-Host "⚠️ Imports de PayloadAction sin 'type':" -ForegroundColor Yellow
    foreach ($match in $reduxImports) {
        Write-Host "  - $($match.Path):$($match.LineNumber)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Imports de Redux correctos" -ForegroundColor Green
}

# Buscar imports relativos incorrectos
$wrongImports = Get-ChildItem -Path "src" -Recurse -Filter "*.ts*" | 
    Select-String -Pattern "from ['\`"]\.\.\/types['\`"]" |
    Select-Object -First 10

if ($wrongImports) {
    Write-Host "⚠️ Imports que deberían usar '/index':" -ForegroundColor Yellow
    foreach ($match in $wrongImports) {
        Write-Host "  - $($match.Path):$($match.LineNumber): Cambiar a '../types/index'" -ForegroundColor Yellow
    }
}
Write-Host ""

# 6. Buscar console.log olvidados
Write-Host "6. BUSCANDO CONSOLE.LOG" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow
$consoleLogs = Get-ChildItem -Path "src" -Recurse -Filter "*.ts*" | 
    Select-String -Pattern "console\.(log|warn|error)" |
    Where-Object { $_.Line -notmatch "^\s*//" } |
    Select-Object -First 10

if ($consoleLogs) {
    Write-Host "⚠️ console.log encontrados (revisar si son necesarios):" -ForegroundColor Yellow
    foreach ($log in $consoleLogs) {
        Write-Host "  - $($log.Path):$($log.LineNumber)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Sin console.log" -ForegroundColor Green
}
Write-Host ""

# 7. Buscar any types
Write-Host "7. BUSCANDO TIPOS 'any' NO EXPLÍCITOS" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow
$anyTypes = Get-ChildItem -Path "src" -Recurse -Filter "*.ts*" | 
    Select-String -Pattern ": any[,;\)]" |
    Where-Object { $_.Line -notmatch "^\s*//" } |
    Select-Object -First 10

if ($anyTypes) {
    Write-Host "⚠️ Tipos 'any' encontrados (considerar tipado explícito):" -ForegroundColor Yellow
    foreach ($any in $anyTypes) {
        Write-Host "  - $($any.Path):$($any.LineNumber)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Sin tipos 'any' explícitos" -ForegroundColor Green
}
Write-Host ""

# 8. Verificar archivos críticos
Write-Host "8. VERIFICANDO ARCHIVOS CRÍTICOS" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$criticalFiles = @(
    "src/main.tsx",
    "src/App.tsx",
    "src/types/index.ts",
    "src/services/api.ts",
    "src/services/auth.service.ts",
    "src/services/socket.service.ts",
    "src/store/index.ts",
    "src/store/slices/authSlice.ts",
    "src/store/slices/chatsSlice.ts",
    "src/store/slices/messagesSlice.ts",
    "src/hooks/redux.ts",
    "src/utils/helpers.ts",
    "package.json",
    "tsconfig.json",
    "vite.config.ts"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "✓ $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "❌ $file FALTANTE" -ForegroundColor Red
    }
}
Write-Host ""

# 9. Verificar problemas comunes en slices
Write-Host "9. VALIDANDO REDUX SLICES" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$sliceIssues = @()

# Verificar que todos los slices exportan correctamente
$slices = Get-ChildItem -Path "src/store/slices" -Filter "*.ts"
foreach ($slice in $slices) {
    $content = Get-Content $slice.FullName -Raw
    
    # Verificar export default
    if ($content -notmatch "export default \w+\.reducer") {
        $sliceIssues += "❌ $($slice.Name): No exporta reducer correctamente"
    }
    
    # Verificar createSlice
    if ($content -notmatch "createSlice\(") {
        $sliceIssues += "⚠️ $($slice.Name): No usa createSlice"
    }
    
    # Verificar type imports para PayloadAction
    if ($content -match "PayloadAction" -and $content -notmatch "import type \{.*PayloadAction.*\}") {
        $sliceIssues += "⚠️ $($slice.Name): PayloadAction sin 'type' import"
    }
}

if ($sliceIssues.Count -eq 0) {
    Write-Host "✓ Todos los slices están correctos" -ForegroundColor Green
} else {
    foreach ($issue in $sliceIssues) {
        Write-Host $issue -ForegroundColor Yellow
    }
}
Write-Host ""

# 10. Estadísticas del proyecto
Write-Host "10. ESTADÍSTICAS DEL PROYECTO" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$tsFiles = (Get-ChildItem -Path "src" -Recurse -Filter "*.ts").Count
$tsxFiles = (Get-ChildItem -Path "src" -Recurse -Filter "*.tsx").Count
$totalLines = (Get-ChildItem -Path "src" -Recurse -Filter "*.ts*" | Get-Content | Measure-Object -Line).Lines

Write-Host "Archivos TypeScript (.ts): $tsFiles" -ForegroundColor Cyan
Write-Host "Archivos React (.tsx): $tsxFiles" -ForegroundColor Cyan
Write-Host "Total archivos: $($tsFiles + $tsxFiles)" -ForegroundColor Cyan
Write-Host "Total líneas de código: $totalLines" -ForegroundColor Cyan
Write-Host ""

# 11. Verificar package.json
Write-Host "11. VERIFICANDO DEPENDENCIAS" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$packageJson = Get-Content "package.json" | ConvertFrom-Json
$requiredDeps = @(
    "@mui/material",
    "@emotion/react",
    "@emotion/styled",
    "@mui/icons-material",
    "@reduxjs/toolkit",
    "react-redux",
    "react-router-dom",
    "axios",
    "socket.io-client",
    "date-fns"
)

Write-Host "Dependencias críticas:" -ForegroundColor Gray
foreach ($dep in $requiredDeps) {
    if ($packageJson.dependencies.$dep) {
        Write-Host "✓ $dep - $($packageJson.dependencies.$dep)" -ForegroundColor Green
    } else {
        Write-Host "❌ $dep FALTANTE" -ForegroundColor Red
    }
}
Write-Host ""

# 12. Generar reporte de errores
Write-Host "12. RESUMEN DE VALIDACIÓN" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$errorCount = 0
$warningCount = 0

if ($tscOutput) { 
    $errorCount += ($tscOutput | Select-String -Pattern "error TS" | Measure-Object).Count 
}
if ($reactImports) { $warningCount += $reactImports.Count }
if ($reduxImports) { $warningCount += $reduxImports.Count }
if ($consoleLogs) { $warningCount += $consoleLogs.Count }

Write-Host "`nResultados:" -ForegroundColor Cyan
Write-Host "  Errores críticos: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host "  Advertencias: $warningCount" -ForegroundColor $(if ($warningCount -gt 0) { "Yellow" } else { "Green" })

if ($errorCount -eq 0) {
    Write-Host "`n✓ VALIDACIÓN COMPLETADA - LISTO PARA PRODUCCIÓN" -ForegroundColor Green
} elseif ($errorCount -lt 5) {
    Write-Host "`n⚠️ VALIDACIÓN COMPLETADA - ERRORES MENORES A CORREGIR" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ VALIDACIÓN COMPLETADA - REQUIERE CORRECCIONES IMPORTANTES" -ForegroundColor Red
}

Write-Host "`n================================================`n" -ForegroundColor Cyan
