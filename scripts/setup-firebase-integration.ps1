# Script de configuración para Firebase Auth + PostgreSQL Integration
# Ejecutar en PowerShell como Administrador

Write-Host "🔥 Configurando Integración Firebase Auth + PostgreSQL" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "📦 Verificando Node.js..." -NoNewline
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host " ❌" -ForegroundColor Red
    Write-Error "Node.js no está instalado. Descarga desde https://nodejs.org/"
    exit 1
}
Write-Host " ✅ ($nodeVersion)" -ForegroundColor Green

# 2. Verificar PostgreSQL
Write-Host "🐘 Verificando PostgreSQL..." -NoNewline
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host " ❌" -ForegroundColor Red
    Write-Warning "PostgreSQL no encontrado en PATH. Asegúrate de tenerlo instalado."
} else {
    Write-Host " ✅" -ForegroundColor Green
}

# 3. Instalar dependencias del backend
Write-Host ""
Write-Host "📥 Instalando dependencias del backend..." -ForegroundColor Yellow
Set-Location ..\server

npm install firebase-admin 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando firebase-admin" -ForegroundColor Red
    exit 1
}
Write-Host "✅ firebase-admin instalado" -ForegroundColor Green

Set-Location ..\scripts

# 4. Verificar archivo de service account
Write-Host ""
Write-Host "🔐 Verificando Service Account de Firebase..." -ForegroundColor Yellow

$serviceAccountPath = "..\server\firebase-service-account.json"
if (-not (Test-Path $serviceAccountPath)) {
    Write-Host "⚠️  No se encontró firebase-service-account.json" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Por favor, descarga el archivo desde:" -ForegroundColor Cyan
    Write-Host "https://console.firebase.google.com/project/app-finperson/settings/serviceaccounts" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Guarda el archivo como: server\firebase-service-account.json" -ForegroundColor Yellow
    Write-Host ""
    
    $continue = Read-Host "¿Has descargado el archivo? (s/n)"
    if ($continue -ne 's' -and $continue -ne 'S') {
        Write-Host "❌ Configuración cancelada. Descarga el archivo y vuelve a ejecutar." -ForegroundColor Red
        exit 1
    }
}

if (Test-Path $serviceAccountPath) {
    Write-Host "✅ Service account encontrado" -ForegroundColor Green
}

# 5. Configurar variables de entorno
Write-Host ""
Write-Host "⚙️  Configurando variables de entorno..." -ForegroundColor Yellow

$envPath = "..\server\.env"
$envExamplePath = "..\server\.env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "✅ Archivo .env creado desde .env.example" -ForegroundColor Green
        Write-Host "📝 Por favor edita $envPath con tus credenciales" -ForegroundColor Yellow
    } else {
        Write-Host "❌ No se encontró .env.example" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Archivo .env ya existe" -ForegroundColor Green
}

# 6. Verificar DATABASE_URL
Write-Host ""
Write-Host "🗄️  Verificando conexión a PostgreSQL..." -ForegroundColor Yellow

$envContent = Get-Content $envPath -Raw
if ($envContent -match 'DATABASE_URL=.*') {
    $dbUrl = ($envContent -match 'DATABASE_URL=(.+)$')[0] -replace 'DATABASE_URL=','' -replace '\s.*',''
    
    if ($dbUrl -and $dbUrl -ne 'postgresql://user:password@host:port/database') {
        Write-Host "✅ DATABASE_URL configurada" -ForegroundColor Green
        
        # Intentar conectar
        try {
            $env:PGPASSWORD = ($dbUrl -replace '.*:(.*?)@.*', '$1')
            $result = psql $dbUrl -c "SELECT 1;" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Conexión a PostgreSQL exitosa" -ForegroundColor Green
            } else {
                Write-Host "⚠️  No se pudo conectar a PostgreSQL" -ForegroundColor Yellow
                Write-Host "   Verifica que PostgreSQL esté corriendo y las credenciales sean correctas" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  No se pudo verificar conexión" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  DATABASE_URL no configurada" -ForegroundColor Yellow
        Write-Host "   Edita $envPath con tu cadena de conexión" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  DATABASE_URL no encontrada en .env" -ForegroundColor Yellow
}

# 7. Ejecutar migraciones
Write-Host ""
Write-Host "🗃️  Ejecutando migraciones..." -ForegroundColor Yellow

$runMigrations = Read-Host "¿Deseas ejecutar las migraciones de PostgreSQL ahora? (s/n)"
if ($runMigrations -eq 's' -or $runMigrations -eq 'S') {
    $dbUrl = Read-Host "Ingresa DATABASE_URL (o presiona Enter para usar el de .env)"
    
    if (-not $dbUrl) {
        # Extraer de .env
        $envContent = Get-Content $envPath -Raw
        $dbUrl = ($envContent -match 'DATABASE_URL=(.+)$')[0] -replace 'DATABASE_URL=','' -replace '\s.*',''
    }
    
    if ($dbUrl) {
        .\setup-postgres.ps1 -DatabaseUrl $dbUrl
    } else {
        Write-Host "❌ No se pudo determinar DATABASE_URL" -ForegroundColor Red
    }
}

# 8. Resumen
Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "🎉 Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Asegúrate de tener firebase-service-account.json en server/" -ForegroundColor White
Write-Host "  2. Configura DATABASE_URL en server/.env" -ForegroundColor White
Write-Host "  3. Inicia el backend: cd server && npm run dev" -ForegroundColor White
Write-Host "  4. Registra un usuario en el frontend" -ForegroundColor White
Write-Host "  5. Sincroniza el usuario: node scripts/sync-firebase-user.js <UID>" -ForegroundColor White
Write-Host ""
Write-Host "Documentación completa en:" -ForegroundColor Cyan
Write-Host "  README-FIREBASE-INTEGRATION.md" -ForegroundColor Blue
Write-Host ""

$startNow = Read-Host "¿Deseas iniciar el backend ahora? (s/n)"
if ($startNow -eq 's' -or $startNow -eq 'S') {
    Set-Location ..\server
    npm run dev
}
