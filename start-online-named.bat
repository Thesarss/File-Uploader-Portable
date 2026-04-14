@echo off
title File Uploader - Online (Named Tunnel)
color 0E

echo ========================================
echo   FILE UPLOADER - ONLINE MODE
echo   Named Tunnel (URL Tetap)
echo ========================================
echo.

REM Cek apakah file konfigurasi sudah disetup
if not exist "cloudflared-named-tunnel.yml" (
    echo ❌ ERROR: File cloudflared-named-tunnel.yml tidak ditemukan!
    echo.
    echo Silakan setup Named Tunnel terlebih dahulu:
    echo 1. Copy cloudflared-named-tunnel.yml.example ke cloudflared-named-tunnel.yml
    echo 2. Edit file tersebut dan ganti ^<TUNNEL-ID^>, ^<USERNAME^>, dan domain
    echo 3. Ikuti instruksi di PANDUAN_LENGKAP.md
    echo.
    pause
    exit /b 1
)

echo Memulai aplikasi dengan Named Tunnel...
echo.

echo [1/3] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && echo Backend Server Running && node dist/index.js"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && echo Frontend Server Running && node serve.cjs"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Cloudflare Named Tunnel...
start "Cloudflare Named Tunnel" cmd /k "echo Named Tunnel Running... && cloudflared.exe tunnel --config cloudflared-named-tunnel.yml run file-uploader"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   ✅ APLIKASI BERJALAN ONLINE!
echo ========================================
echo.
echo 🌐 Akses aplikasi di URL yang sudah Anda setup
echo    Contoh: https://upload.yourdomain.com
echo.
echo 📁 File disimpan di: D:\uploads\
echo.
echo ⚠️  Pastikan sudah setup DNS di Cloudflare!
echo    Lihat PANDUAN_LENGKAP.md untuk detail
echo.
pause
