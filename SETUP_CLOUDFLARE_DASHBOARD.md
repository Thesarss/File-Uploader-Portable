# 🚀 Setup Cloudflare Tunnel via Dashboard (URL Tetap)

## ✅ Status Saat Ini

Tunnel "File-Uploader" sudah berhasil dibuat dan statusnya **Healthy**! 🎉

Sekarang kita tinggal setup DNS dan konfigurasi aplikasi agar bisa diakses dengan URL yang tetap.

---

## 📋 Langkah-Langkah Setup

### Step 1: Dapatkan Informasi Tunnel

1. **Buka Cloudflare Dashboard** (sudah terbuka)
2. **Klik pada tunnel "File-Uploader"** untuk melihat detail
3. **Catat informasi berikut:**
   - Tunnel ID (biasanya format: `abc123def456`)
   - Tunnel Token (jika ada)

---

### Step 2: Setup Public Hostname (DNS)

Di halaman detail tunnel "File-Uploader":

1. **Klik tab "Public Hostname"** atau "Configure"
2. **Tambah hostname untuk Frontend:**
   - Subdomain: `upload` (atau nama lain yang Anda inginkan)
   - Domain: pilih domain Anda (atau gunakan `trycloudflare.com` untuk gratis)
   - Path: kosongkan
   - Type: `HTTP`
   - URL: `localhost:4173`
   - Klik **Save**

3. **Tambah hostname untuk Backend:**
   - Subdomain: `upload-api` (atau nama lain)
   - Domain: sama dengan di atas
   - Path: kosongkan
   - Type: `HTTP`
   - URL: `localhost:3000`
   - Klik **Save**

**Contoh URL yang akan didapat:**
- Frontend: `https://upload.trycloudflare.com` atau `https://upload.yourdomain.com`
- Backend: `https://upload-api.trycloudflare.com` atau `https://upload-api.yourdomain.com`

---

### Step 3: Install Cloudflare Connector

Karena tunnel sudah dibuat via dashboard, kita perlu install connector di PC:

1. **Download connector token** dari dashboard (ada tombol "Install and run a connector")
2. **Atau jalankan command yang diberikan di dashboard**

Biasanya formatnya seperti ini:
```bash
cloudflared.exe service install <TOKEN>
```

**Anda sudah melakukan ini!** ✅

---

### Step 4: Update Konfigurasi Aplikasi

#### A. Update Backend (.env)

```bash
cd backend
notepad .env
```

Tambahkan URL frontend Anda ke `ALLOWED_ORIGINS`:

```env
# Ganti dengan URL yang Anda dapat dari Step 2
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173,https://upload.trycloudflare.com
```

**Simpan file!**

#### B. Update Frontend (.env)

```bash
cd frontend
notepad .env
```

Ganti `VITE_API_BASE_URL` dengan URL backend Anda:

```env
# Ganti dengan URL backend dari Step 2
VITE_API_BASE_URL=https://upload-api.trycloudflare.com
VITE_API_TIMEOUT=300000
```

**Simpan file!**

---

### Step 5: Rebuild Frontend

```bash
cd frontend
npm run build
```

Tunggu sampai selesai (biasanya 10-30 detik).

---

### Step 6: Restart Aplikasi

#### Cara 1: Manual

**Terminal 1 - Backend:**
```bash
cd backend
node dist/index.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
node serve.cjs
```

**Cloudflare service sudah jalan otomatis di background!** ✅

#### Cara 2: Pakai Script

Buat file `start-with-cloudflare.bat`:

```batch
@echo off
title File Uploader - Online (Cloudflare Dashboard)
color 0E

echo ========================================
echo   FILE UPLOADER - ONLINE MODE
echo   Cloudflare Tunnel (URL Tetap)
echo ========================================
echo.

echo [1/2] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && node dist/index.js"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && node serve.cjs"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ✅ APLIKASI BERJALAN ONLINE!
echo ========================================
echo.
echo 🌐 Akses aplikasi di:
echo    Frontend: https://upload.trycloudflare.com
echo    Backend:  https://upload-api.trycloudflare.com
echo.
echo 📁 File disimpan di: D:\uploads\
echo.
echo ℹ️  Cloudflare service sudah jalan otomatis!
echo.
pause
```

Jalankan: `start-with-cloudflare.bat`

---

### Step 7: Test Aplikasi

1. **Buka browser**
2. **Akses URL frontend Anda** (contoh: `https://upload.trycloudflare.com`)
3. **Upload file untuk test**
4. **Cek apakah file tersimpan di `D:\uploads\`**

---

## 🎉 Selesai!

URL Anda sekarang **TETAP** dan tidak akan berubah!

### Keuntungan Setup via Dashboard:
- ✅ Lebih mudah (tidak perlu CLI)
- ✅ URL tetap selamanya
- ✅ Bisa manage dari dashboard
- ✅ Service jalan otomatis di background
- ✅ Tidak perlu restart manual setiap boot

### URL Anda:
- **Frontend:** `https://upload.trycloudflare.com` (atau domain custom Anda)
- **Backend:** `https://upload-api.trycloudflare.com` (atau domain custom Anda)

**URL ini tidak akan berubah meskipun:**
- ✅ Laptop mati
- ✅ Restart Windows
- ✅ Mati listrik
- ✅ Besok, minggu depan, bulan depan

---

## 🔧 Troubleshooting

### 1. Tunnel tidak connect

**Cek service status:**
```bash
sc query Cloudflared
```

**Restart service:**
```bash
net stop Cloudflared
net start Cloudflared
```

### 2. CORS Error

**Solusi:**
1. Pastikan URL frontend sudah ada di `backend/.env` → `ALLOWED_ORIGINS`
2. Restart backend

### 3. 502 Bad Gateway

**Solusi:**
1. Pastikan backend dan frontend sudah running
2. Cek port 3000 dan 4173 tidak dipakai aplikasi lain
3. Restart backend dan frontend

### 4. URL tidak bisa diakses

**Solusi:**
1. Cek di Cloudflare Dashboard → Tunnels → File-Uploader
2. Pastikan status "Healthy"
3. Cek Public Hostname sudah disetup dengan benar
4. Tunggu 1-2 menit untuk DNS propagation

---

## 📝 Catatan Penting

### Cek Status Tunnel

Buka Cloudflare Dashboard:
- Zero Trust → Access → Tunnels
- Lihat status tunnel "File-Uploader"
- Harus "Healthy" (hijau)

### Manage Tunnel

Semua management dilakukan via dashboard:
- Tambah/hapus hostname
- Lihat traffic
- Lihat logs
- Update konfigurasi

### Backup

Tidak perlu backup file config karena semua tersimpan di Cloudflare!

---

## 🎯 Next Steps

1. **Selesaikan Step 2** (Setup Public Hostname di dashboard)
2. **Update konfigurasi** aplikasi (Step 4)
3. **Rebuild frontend** (Step 5)
4. **Restart aplikasi** (Step 6)
5. **Test!** (Step 7)

**Selamat! Aplikasi Anda akan online dengan URL tetap! 🚀**
