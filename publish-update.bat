@echo off
echo ========================================
echo MediSoft Pro - Auto Update Publisher
echo ========================================
echo.

REM Step 1: Build the application
echo [1/3] Building application...
call npm run dist
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo Build completed successfully!
echo.

REM Step 2: Copy files to update server
echo [2/3] Copying files to update server...

REM Copy latest.yml
copy /Y "release\latest.yml" "C:\MediSoftUpdates\"
if errorlevel 1 (
    echo ERROR: Failed to copy latest.yml
    pause
    exit /b 1
)

REM Find and copy the latest exe file
for %%f in (release\*.exe) do (
    if not "%%~nxf"=="__uninstaller.exe" (
        echo Copying %%~nxf...
        copy /Y "%%f" "C:\MediSoftUpdates\"
        copy /Y "%%f.blockmap" "C:\MediSoftUpdates\"
    )
)
echo Files copied successfully!
echo.

REM Step 3: List files in update server
echo [3/3] Update server contents:
dir /B "C:\MediSoftUpdates\"
echo.

echo ========================================
echo Update published successfully!
echo.
echo Server URL: http://192.168.0.110:8080
echo.
echo Make sure HTTP server is running:
echo   cd C:\MediSoftUpdates
echo   python -m http.server 8080
echo ========================================
pause
