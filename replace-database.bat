@echo off
echo =====================================
echo MediSoft Pro - Database Replacement
echo =====================================
echo.

REM Kill the app if running
echo [1/4] Closing MediSoft Pro...
taskkill /F /IM "MediSoft Pro.exe" 2>nul
timeout /t 2 >nul

REM Set paths
set "DB_DIR=%appdata%\medisoft-pro\data"
set "BACKUP_DIR=%appdata%\medisoft-pro\data\backups"

echo [2/4] Creating backup of current database...
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if exist "%DB_DIR%\medisoft.db" (
    copy "%DB_DIR%\medisoft.db" "%BACKUP_DIR%\medisoft_manual_backup_%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%.db" >nul
    echo    Backup created successfully!
) else (
    echo    No existing database found.
)

echo [3/4] Cleaning old database files...
del /F /Q "%DB_DIR%\medisoft.db" 2>nul
del /F /Q "%DB_DIR%\medisoft.db-shm" 2>nul
del /F /Q "%DB_DIR%\medisoft.db-wal" 2>nul
echo    Old files deleted.

echo [4/4] Ready to paste new database!
echo.
echo INSTRUCTIONS:
echo 1. Copy your NEW medisoft.db file
echo 2. Paste it to: %DB_DIR%
echo 3. Press any key to launch MediSoft Pro...
echo.
pause

REM Open the folder for user
explorer "%DB_DIR%"

echo.
echo After pasting the file, press any key to launch app...
pause

REM Launch app (adjust path if needed)
echo Starting MediSoft Pro...
start "" "%LOCALAPPDATA%\Programs\medisoft-pro\MediSoft Pro.exe"

echo.
echo Done! Check if data is showing correctly.
pause
