@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js, then run this file again.
  pause
  exit /b 1
)
if not exist "node_modules\pdfjs-dist\package.json" (
  echo Installing PDF support libraries for first use...
  call npm install
  if errorlevel 1 (
    echo Installation failed. Please check that Node.js and npm are installed.
    pause
    exit /b 1
  )
)
start "Image Obfuscator" /b cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:3210"
node server.mjs
pause
