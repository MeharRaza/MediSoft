@echo off
title MediSoft Pro Launcher
cd /d "%~dp0"
echo Starting MediSoft Pro in Desktop Mode...
set ELECTRON_RUN_AS_NODE=
start "" "node_modules\electron\dist\electron.exe" .
exit
