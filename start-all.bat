@echo off
title File Uploader - Lokal
color 0A

echo ========================================
echo   FILE UPLOADER - MODE LOKAL
echo ========================================
echo.
echo Memulai aplikasi...
echo.

echo [1/2] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && echo Backend Server Running on http://localhost:3000 && node dist/index.js"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && echo Frontend Server Running on http://localhost:4173 && node serve.cjs"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ✅ APLIKASI BERJALAN!
echo ========================================
echo.
echo 🌐 Akses Web: http://localhost:4173
echo 📁 File disimpan di: D:\uploads\
echo.
echo Jangan tutup terminal yang terbuka!
echo Tekan Ctrl+C di terminal untuk stop.
echo.
pause
