@echo off
echo Starting MediSoft Update Server...
echo Server URL: http://192.168.1.21:8080
echo.
cd /d C:\MediSoftUpdates
python -m http.server 8080
