@echo off
title File Uploader - Online (Ngrok)
color 0E

echo ========================================
echo   FILE UPLOADER - ONLINE MODE
echo   Ngrok Tunnel (URL Tetap)
echo ========================================
echo.

echo Memulai aplikasi dengan Ngrok...
echo.

echo [1/4] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && echo Backend Server Running on Port 3000 && node dist/index.js"
timeout /t 3 /nobreak >nul

echo [2/4] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && echo Frontend Server Running on Port 4173 && node serve.cjs"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Ngrok Tunnel for Frontend...
start "Ngrok Frontend" cmd /k "echo Ngrok Frontend Tunnel && \"C:\Users\Muhammad Thesar\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe\" http 4173"
timeout /t 3 /nobreak >nul

echo [4/4] Starting Ngrok Tunnel for Backend...
start "Ngrok Backend" cmd /k "echo Ngrok Backend Tunnel && \"C:\Users\Muhammad Thesar\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe\" http 3000"
timeout /t 3 /nobreak >nul

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
echo 💡 Tips:
echo    - URL ngrok akan tetap sama jika pakai static domain
echo    - Buka http://localhost:4040 untuk lihat traffic
echo    - Bagikan URL ke teman untuk akses dari mana saja
echo.
echo ⚠️  PENTING:
echo    Jika belum setup authtoken, jalankan:
echo    ngrok config add-authtoken ^<YOUR_TOKEN^>
echo.
pause
