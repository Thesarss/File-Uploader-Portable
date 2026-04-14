@echo off
title File Uploader - Online (Quick Tunnel)
color 0B

echo ========================================
echo   FILE UPLOADER - ONLINE MODE
echo   Quick Tunnel (URL Random)
echo ========================================
echo.
echo Memulai aplikasi dengan akses online...
echo.

echo [1/4] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && echo Backend Server Running && node dist/index.js"
timeout /t 3 /nobreak >nul

echo [2/4] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && echo Frontend Server Running && node serve.cjs"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Cloudflare Tunnel - Frontend...
start "Cloudflare Tunnel - Frontend" cmd /k "echo FRONTEND TUNNEL - Tunggu URL muncul... && cloudflared.exe tunnel --url http://localhost:4173"
timeout /t 5 /nobreak >nul

echo [4/4] Starting Cloudflare Tunnel - Backend...
start "Cloudflare Tunnel - Backend" cmd /k "echo BACKEND TUNNEL - Tunggu URL muncul... && cloudflared.exe tunnel --url http://localhost:3000"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   ✅ APLIKASI BERJALAN ONLINE!
echo ========================================
echo.
echo 📋 CEK TERMINAL "Cloudflare Tunnel" untuk URL
echo.
echo LANGKAH SELANJUTNYA:
echo 1. Cari URL di terminal "Cloudflare Tunnel - Backend"
echo    Contoh: https://xxx-yyy-zzz.trycloudflare.com
echo.
echo 2. Copy URL backend tersebut
echo.
echo 3. Update frontend/.env:
echo    VITE_API_BASE_URL=https://xxx-yyy-zzz.trycloudflare.com
echo.
echo 4. Update backend/.env, tambahkan ke ALLOWED_ORIGINS:
echo    ALLOWED_ORIGINS=...,https://frontend-url.trycloudflare.com
echo.
echo 5. Rebuild frontend: cd frontend ^&^& npm run build
echo.
echo 6. Restart semua service (jalankan script ini lagi)
echo.
echo ⚠️  URL akan berubah setiap restart!
echo    Untuk URL tetap, gunakan start-online-named.bat
echo.
pause
