@echo off
title File Uploader - Online (Ngrok)
color 0E

echo ========================================
echo   FILE UPLOADER - ONLINE MODE
echo   Ngrok Tunnel
echo ========================================
echo.

echo Memulai aplikasi...
echo.

echo [1/3] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && echo Backend Server Running on Port 3000 && node dist/index.js"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && echo Frontend Server Running on Port 4173 && node serve.cjs"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Ngrok Tunnel...
start "Ngrok Tunnel" cmd /k "echo Ngrok Tunnel Starting... && ngrok http 4173"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   ✅ APLIKASI BERJALAN ONLINE!
echo ========================================
echo.
echo 🌐 Untuk melihat URL ngrok Anda:
echo    1. Buka browser
echo    2. Akses: http://localhost:4040
echo    3. Copy URL yang ditampilkan
echo.
echo 📁 File disimpan di: D:\uploads\
echo.
echo 💡 URL Saat Ini:
echo    https://twitch-sample-devotedly.ngrok-free.dev
echo.
echo ⚠️  CATATAN:
echo    - Ngrok free tier hanya support 1 tunnel
echo    - URL akan berubah setiap restart
echo    - Untuk URL tetap, upgrade ke paid plan
echo.
echo 📖 Baca dokumentasi lengkap: NGROK_SETUP_COMPLETE.md
echo.
pause
