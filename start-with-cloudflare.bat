@echo off
title File Uploader - Online (Cloudflare Tunnel)
color 0E

echo ========================================
echo   FILE UPLOADER - ONLINE MODE
echo   Cloudflare Tunnel (URL Tetap)
echo ========================================
echo.

echo Memulai aplikasi dengan Cloudflare Tunnel...
echo.

echo [1/2] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && echo Backend Server Running on Port 3000 && node dist/index.js"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && echo Frontend Server Running on Port 4173 && node serve.cjs"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ✅ APLIKASI BERJALAN ONLINE!
echo ========================================
echo.
echo 🌐 Akses aplikasi di:
echo    Frontend: https://sarwdyup.com
echo    Backend:  https://widysarup-api.sarwdyup.com
echo.
echo 📁 File disimpan di: D:\uploads\
echo.
echo ℹ️  Cloudflare Tunnel service sudah jalan otomatis di background!
echo    Tunnel Name: File-Uploader
echo    Status: Healthy
echo.
echo 💡 Tips:
echo    - URL ini TETAP dan tidak akan berubah
echo    - Bisa diakses dari mana saja (PC, HP, tablet)
echo    - Cloudflare service jalan otomatis saat Windows start
echo.
pause
