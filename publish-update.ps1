# MediSoft Pro - Auto Update Publisher (PowerShell)
# =================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MediSoft Pro - Auto Update Publisher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$releaseDir = "release"
$updateServerDir = "C:\MediSoftUpdates"
$serverUrl = "http://192.168.0.110:8080"

# Step 1: Check if update server directory exists
Write-Host "[0/4] Checking update server directory..." -ForegroundColor Yellow
if (-not (Test-Path $updateServerDir)) {
    Write-Host "Creating update server directory: $updateServerDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $updateServerDir -Force | Out-Null
}
Write-Host "Update server directory OK!" -ForegroundColor Green
Write-Host ""

# Step 2: Build the application
Write-Host "[1/4] Building application..." -ForegroundColor Yellow
npm run dist
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Copy files to update server
Write-Host "[2/4] Copying files to update server..." -ForegroundColor Yellow

# Copy latest.yml
$latestYml = Join-Path $releaseDir "latest.yml"
if (Test-Path $latestYml) {
    Copy-Item $latestYml -Destination $updateServerDir -Force
    Write-Host "  ✓ Copied: latest.yml" -ForegroundColor Green
} else {
    Write-Host "  ✗ ERROR: latest.yml not found!" -ForegroundColor Red
    exit 1
}

# Copy exe and blockmap files
$exeFiles = Get-ChildItem -Path $releaseDir -Filter "*.exe" | Where-Object { $_.Name -notlike "*__uninstaller*" }
foreach ($file in $exeFiles) {
    Copy-Item $file.FullName -Destination $updateServerDir -Force
    Write-Host "  ✓ Copied: $($file.Name)" -ForegroundColor Green
    
    $blockmapFile = "$($file.FullName).blockmap"
    if (Test-Path $blockmapFile) {
        Copy-Item $blockmapFile -Destination $updateServerDir -Force
        Write-Host "  ✓ Copied: $($file.Name).blockmap" -ForegroundColor Green
    }
}
Write-Host "Files copied successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Display update server contents
Write-Host "[3/4] Update server contents:" -ForegroundColor Yellow
$files = Get-ChildItem $updateServerDir
foreach ($file in $files) {
    $sizeInMB = [math]::Round($file.Length / 1MB, 2)
    Write-Host "  - $($file.Name) ($sizeInMB MB)" -ForegroundColor Cyan
}
Write-Host ""

# Step 5: Check if HTTP server is running
Write-Host "[4/4] Checking HTTP server status..." -ForegroundColor Yellow
$serverRunning = netstat -ano | Select-String "8080" | Select-String "LISTENING"
if ($serverRunning) {
    Write-Host "  ✓ HTTP server is running on port 8080" -ForegroundColor Green
} else {
    Write-Host "  ⚠ WARNING: HTTP server not detected on port 8080" -ForegroundColor Yellow
    Write-Host "  Start the server with: python -m http.server 8080" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Update published successfully!" -ForegroundColor Green
Write-Host "" -ForegroundColor Cyan
Write-Host "Server URL: $serverUrl" -ForegroundColor Cyan
Write-Host "Test URL: $serverUrl/latest.yml" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Ensure HTTP server is running" -ForegroundColor White
Write-Host "  2. Test in browser: $serverUrl/latest.yml" -ForegroundColor White
Write-Host "  3. Client apps will auto-detect the update" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to test the server
$response = Read-Host "Do you want to test the update server in browser? (Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Start-Process "$serverUrl/latest.yml"
}
