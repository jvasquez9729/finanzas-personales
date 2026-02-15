# Script de configuración para PostgreSQL + Firebase Auth
# Ejecutar en PowerShell como Administrador

param(
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$FirebaseServiceAccountPath = "..\firebase-service-account.json"
)

Write-Host "🔧 Configurando PostgreSQL para Finanzas Personales" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que psql está disponible
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Error "❌ PostgreSQL (psql) no está instalado o no está en el PATH"
    Write-Host "Instala PostgreSQL desde: https://www.postgresql.org/download/"
    exit 1
}

Write-Host "✅ PostgreSQL encontrado" -ForegroundColor Green

# Directorio de migraciones
$migrationsDir = "..\supabase\migrations"
$migrations = @(
    "20260200120000_local_auth_schema.sql",
    "20260201120000_ledger.sql",
    "20260202120000_audit.sql",
    "20260203120000_analytics.sql",
    "20260204120000_monthly_close.sql",
    "20260205120000_alerts.sql",
    "20260206120000_auth_password.sql",
    "20260207120000_security_and_budgets.sql"
)

Write-Host ""
Write-Host "📦 Ejecutando migraciones..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($migration in $migrations) {
    $migrationPath = Join-Path $migrationsDir $migration
    
    if (-not (Test-Path $migrationPath)) {
        Write-Warning "⚠️  Migración no encontrada: $migration"
        continue
    }
    
    Write-Host "Ejecutando: $migration" -NoNewline
    
    try {
        # Ejecutar migración
        $env:PGPASSWORD = ($DatabaseUrl -replace '.*:(.*?)@.*', '$1')
        $result = psql $DatabaseUrl -f $migrationPath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✅" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " ❌" -ForegroundColor Red
            Write-Error $result
            $failCount++
        }
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Error $_.Exception.Message
        $failCount++
    }
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "  ✅ Exitosas: $successCount" -ForegroundColor Green
Write-Host "  ❌ Fallidas: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "🎉 Todas las migraciones se ejecutaron correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor Yellow
    Write-Host "  1. Configura el webhook de Firebase Auth (ver README-FIREBASE-INTEGRATION.md)"
    Write-Host "  2. Inicia el backend: cd server && npm run dev"
    Write-Host "  3. Prueba el health check: curl http://localhost:3001/make-server-d3c93e65/health"
} else {
    Write-Error "❌ Algunas migraciones fallaron. Revisa los errores arriba."
    exit 1
}
