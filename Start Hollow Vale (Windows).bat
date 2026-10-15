@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed on this computer.
  echo  Install the free LTS version from https://nodejs.org and then run this file again.
  echo.
  start https://nodejs.org
  pause
  exit /b
)
start "" "http://localhost:3000/?lobby"
node server.js
pause
