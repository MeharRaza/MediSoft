Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "MediSoft Pro - Database Replacement" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Close app if running
Write-Host "[1/5] Closing MediSoft Pro..." -ForegroundColor Yellow
Get-Process "MediSoft Pro" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Set paths
$dbDir = "$env:APPDATA\medisoft-pro\data"
$backupDir = "$env:APPDATA\medisoft-pro\data\backups"

# Create backup
Write-Host "[2/5] Creating backup of current database..." -ForegroundColor Yellow
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

if (Test-Path "$dbDir\medisoft.db") {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    Copy-Item "$dbDir\medisoft.db" "$backupDir\medisoft_manual_backup_$timestamp.db"
    Write-Host "   Backup created successfully!" -ForegroundColor Green
} else {
    Write-Host "   No existing database found." -ForegroundColor Gray
}

# Delete old files
Write-Host "[3/5] Cleaning old database files..." -ForegroundColor Yellow
Remove-Item "$dbDir\medisoft.db" -Force -ErrorAction SilentlyContinue
Remove-Item "$dbDir\medisoft.db-shm" -Force -ErrorAction SilentlyContinue
Remove-Item "$dbDir\medisoft.db-wal" -Force -ErrorAction SilentlyContinue
Write-Host "   Old files deleted." -ForegroundColor Green

# Open folder
Write-Host "[4/5] Opening database folder..." -ForegroundColor Yellow
explorer $dbDir
Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Cyan
Write-Host "1. Copy your NEW medisoft.db file (from PC A or USB)"
Write-Host "2. Paste it into the opened folder"
Write-Host "3. Come back and press any key..."
Write-Host ""
Write-Host "Database folder: $dbDir" -ForegroundColor Gray
Write-Host ""
pause

# Launch app
Write-Host "[5/5] Starting MediSoft Pro..." -ForegroundColor Yellow
$appPath = "$env:LOCALAPPDATA\Programs\medisoft-pro\MediSoft Pro.exe"

if (Test-Path $appPath) {
    Start-Process $appPath
    Write-Host ""
    Write-Host "Done! App launched successfully." -ForegroundColor Green
    Write-Host "Check if your data is showing correctly." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Error: Could not find MediSoft Pro executable at:" -ForegroundColor Red
    Write-Host $appPath -ForegroundColor Gray
    Write-Host "Please launch the app manually from Start Menu." -ForegroundColor Yellow
}

Write-Host ""
pause
