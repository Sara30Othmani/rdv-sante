# Script de lancement PowerShell pour Smart Medical Appointment
Set-Location -Path $PSScriptRoot

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "     SMART MEDICAL APPOINTMENT (RDV SANTE)" -ForegroundColor Cyan
Write-Host "     Module 3 : Gestion du Stock Medecin" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env.local")) {
    Write-Host "[INFO] Creation de .env.local..." -ForegroundColor Yellow
    @"
MONGODB_URI=mongodb://localhost:27017/sante-rdv
ALLOW_DEMO_LOGIN=true
"@ | Out-File -FilePath ".env.local" -Encoding utf8
}

if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installation des dependances (npm install)..." -ForegroundColor Yellow
    npm install
}

Write-Host "Choisissez une option :" -ForegroundColor Green
Write-Host "  [1] Lancer l'application (npm run dev)"
Write-Host "  [2] Initialiser la base de donnees (npm run seed) puis lancer"
Write-Host "  [3] Executer les tests de l'API (npm run test:api)"
Write-Host "  [4] Quitter"
Write-Host ""
$choice = Read-Host "Votre choix [1]"

if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "1") {
    Start-Process "http://localhost:3000"
    npm run dev
} elseif ($choice -eq "2") {
    npm run seed
    Start-Process "http://localhost:3000"
    npm run dev
} elseif ($choice -eq "3") {
    npm run test:api
}
