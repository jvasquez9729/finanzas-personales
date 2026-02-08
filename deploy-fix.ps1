# Script de Deploy - Solución Login
# Ejecuta este script en PowerShell como Administrador

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  SOLUCIÓN: Error de Login localhost:3001" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar directorio
$projectPath = "C:\Users\vasqu\OneDrive\Desktop\finanzas_personales\Aplicación web de finanzas"
Write-Host "[1/5] Verificando directorio del proyecto..." -ForegroundColor Yellow
if (Test-Path $projectPath) {
    Set-Location $projectPath
    Write-Host "✓ Directorio encontrado" -ForegroundColor Green
} else {
    Write-Host "✗ Error: No se encuentra el directorio del proyecto" -ForegroundColor Red
    exit 1
}

# Paso 2: Git Add
Write-Host ""
Write-Host "[2/5] Agregando archivos modificados..." -ForegroundColor Yellow
git add src/app/pages/Landing.tsx SOLUCION_LOGIN.md deploy-fix.ps1
Write-Host "✓ Archivos agregados" -ForegroundColor Green

# Paso 3: Git Commit
Write-Host ""
Write-Host "[3/5] Creando commit..." -ForegroundColor Yellow
git commit -m "Force rebuild: Invalidate Vercel cache and fix login"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Commit creado exitosamente" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: No hay cambios para commitear o error en commit" -ForegroundColor Yellow
}

# Paso 4: Git Push
Write-Host ""
Write-Host "[4/5] Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Push exitoso a GitHub" -ForegroundColor Green
} else {
    Write-Host "✗ Error en push - Verifica tu conexión a internet" -ForegroundColor Red
    exit 1
}

# Paso 5: Instrucciones finales
Write-Host ""
Write-Host "[5/5] Deploy iniciado en Vercel" -ForegroundColor Yellow
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PRÓXIMOS PASOS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Abre Vercel:" -ForegroundColor White
Write-Host "   https://vercel.com" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Espera 2-3 minutos a que el deployment esté 'Ready'" -ForegroundColor White
Write-Host ""
Write-Host "3. IMPORTANTE: Limpia la caché del navegador:" -ForegroundColor White
Write-Host "   - Presiona: Ctrl + Shift + Delete" -ForegroundColor Gray
Write-Host "   - Marca: Cookies + Caché" -ForegroundColor Gray
Write-Host "   - Rango: Todo" -ForegroundColor Gray
Write-Host "   - Click: Borrar datos" -ForegroundColor Gray
Write-Host "   - Cierra el navegador COMPLETAMENTE" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Abre tu aplicación:" -ForegroundColor White
Write-Host "   https://finanzas-personales1.vercel.app/" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Si aún falla, prueba en modo incógnito:" -ForegroundColor White
Write-Host "   Ctrl + Shift + N" -ForegroundColor Gray
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Script completado" -ForegroundColor Green
Write-Host ""

# Abrir Vercel en el navegador
Write-Host "Abriendo Vercel en el navegador..." -ForegroundColor Yellow
Start-Process "https://vercel.com"

# Esperar para que el usuario lea
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
