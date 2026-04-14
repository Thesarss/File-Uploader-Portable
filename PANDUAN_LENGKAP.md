# 📚 Panduan Lengkap File Uploader

## 📋 Daftar Isi
1. [Instalasi Awal](#instalasi-awal)
2. [Menjalankan Aplikasi](#menjalankan-aplikasi)
3. [Akses Online dengan URL Tetap](#akses-online-dengan-url-tetap)
4. [Konfigurasi](#konfigurasi)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Instalasi Awal

### Prasyarat
- Node.js (versi 18 atau lebih baru)
- npm atau yarn
- Windows OS

### Langkah 1: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Langkah 2: Setup Environment Files

**Backend (.env):**
```env
PORT=3000
NODE_ENV=development
TARGET_FOLDER=D:/uploads
MAX_FILE_SIZE=524288000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

**Frontend (.env):**
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=300000
```

### Langkah 3: Build Backend
```bash
cd backend
npm run build
```

### Langkah 4: Build Frontend
```bash
cd frontend
npm run build
```

### Langkah 5: Buat Folder Upload
```bash
mkdir D:\uploads
```

---

## 🎯 Menjalankan Aplikasi

### Mode Lokal (Tanpa Internet)

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

**Akses:** http://localhost:4173

---

## 🌐 Akses Online dengan URL Tetap

### Opsi 1: Quick Tunnel (URL Random - Gratis)

**Kelebihan:**
- ✅ Gratis
- ✅ Setup cepat (1 menit)
- ✅ Tidak perlu akun

**Kekurangan:**
- ❌ URL berubah setiap restart
- ❌ Timeout 100 detik

**Cara Pakai:**

**Terminal 3 - Tunnel Frontend:**
```bash
.\cloudflared.exe tunnel --url http://localhost:4173
```

**Terminal 4 - Tunnel Backend:**
```bash
.\cloudflared.exe tunnel --url http://localhost:3000
```

Cloudflare akan memberikan URL seperti:
- Frontend: `https://random-words.trycloudflare.com`
- Backend: `https://other-random-words.trycloudflare.com`

**Update konfigurasi:**
1. Copy URL backend ke `frontend/.env` → `VITE_API_BASE_URL`
2. Tambahkan kedua URL ke `backend/.env` → `ALLOWED_ORIGINS`
3. Rebuild frontend: `cd frontend && npm run build`
4. Restart semua service

---

### Opsi 2: Named Tunnel (URL Tetap - Gratis)

**Kelebihan:**
- ✅ Gratis
- ✅ URL tetap (tidak berubah)
- ✅ Bisa custom subdomain
- ✅ Lebih stabil

**Kekurangan:**
- ❌ Perlu akun Cloudflare (gratis)
- ❌ Setup lebih lama (10-15 menit)
- ❌ Tetap ada timeout 100 detik

**Langkah-langkah:**

#### 1. Buat Akun Cloudflare
- Daftar di https://dash.cloudflare.com/sign-up
- Verifikasi email
- Login ke dashboard

#### 2. Login via Cloudflared
```bash
.\cloudflared.exe tunnel login
```
- Browser akan terbuka
- Pilih domain atau buat baru (bisa pakai subdomain gratis)
- Authorize

#### 3. Buat Tunnel dengan Nama
```bash
.\cloudflared.exe tunnel create file-uploader
```

Output akan seperti:
```
Tunnel credentials written to: C:\Users\YourName\.cloudflared\<TUNNEL-ID>.json
Created tunnel file-uploader with id <TUNNEL-ID>
```

**Simpan TUNNEL-ID ini!**

#### 4. Buat File Konfigurasi

Buat file `cloudflared-tunnel.yml` di root project:

```yaml
tunnel: <TUNNEL-ID>
credentials-file: C:\Users\YourName\.cloudflared\<TUNNEL-ID>.json

ingress:
  # Frontend
  - hostname: upload.yourdomain.com
    service: http://localhost:4173
  
  # Backend API
  - hostname: api.yourdomain.com
    service: http://localhost:3000
  
  # Catch-all rule (required)
  - service: http_status:404
```

**Ganti:**
- `<TUNNEL-ID>` dengan ID tunnel Anda
- `upload.yourdomain.com` dengan subdomain yang Anda inginkan
- `api.yourdomain.com` dengan subdomain untuk API

#### 5. Setup DNS di Cloudflare

```bash
.\cloudflared.exe tunnel route dns file-uploader upload.yourdomain.com
.\cloudflared.exe tunnel route dns file-uploader api.yourdomain.com
```

#### 6. Update Konfigurasi Aplikasi

**Frontend (.env):**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_TIMEOUT=300000
```

**Backend (.env):**
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173,https://upload.yourdomain.com
```

#### 7. Rebuild Frontend
```bash
cd frontend
npm run build
```

#### 8. Jalankan Tunnel
```bash
.\cloudflared.exe tunnel --config cloudflared-tunnel.yml run file-uploader
```

#### 9. Akses Aplikasi
- Frontend: https://upload.yourdomain.com
- Backend API: https://api.yourdomain.com

---

### Opsi 3: Cloudflare Tunnel dengan Subdomain Gratis

Jika tidak punya domain sendiri, Cloudflare menyediakan subdomain gratis:

#### 1-3. Sama seperti Opsi 2

#### 4. Gunakan Subdomain Gratis

Saat setup DNS, gunakan format:
```bash
.\cloudflared.exe tunnel route dns file-uploader file-uploader.trycloudflare.com
```

Cloudflare akan memberikan subdomain gratis seperti:
- `file-uploader.trycloudflare.com`

**Catatan:** Subdomain ini tetap dan tidak berubah!

---

## ⚙️ Konfigurasi

### Backend Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| PORT | 3000 | Port backend server |
| TARGET_FOLDER | D:/uploads | Lokasi penyimpanan file |
| MAX_FILE_SIZE | 524288000 | Max ukuran file (500MB) |
| ALLOWED_ORIGINS | localhost | CORS allowed origins |

### Frontend Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| VITE_API_BASE_URL | http://localhost:3000 | URL backend API |
| VITE_API_TIMEOUT | 300000 | Timeout request (5 menit) |

---

## 🔧 Troubleshooting

### Upload Gagal
**Masalah:** File tidak terupload

**Solusi:**
1. Cek semua terminal masih running
2. Cek folder D:\uploads ada dan bisa ditulis
3. Cek ukuran file < 500MB
4. Refresh halaman web

### CORS Error
**Masalah:** "Access blocked by CORS policy"

**Solusi:**
1. Tambahkan URL frontend ke `ALLOWED_ORIGINS` di backend/.env
2. Restart backend
3. Contoh: `ALLOWED_ORIGINS=http://localhost:4173,https://your-url.com`

### Timeout Error
**Masalah:** "Connection timeout" saat upload file besar

**Solusi:**
- File ≥50MB otomatis pakai chunked upload
- Cek koneksi internet
- Pastikan backend running

### History Kosong
**Masalah:** Upload history tidak muncul

**Solusi:**
1. Klik tombol "Refresh"
2. Cek backend logs (terminal backend)
3. Pastikan database running (jika pakai Docker)

### Tunnel URL Berubah
**Masalah:** URL Cloudflare berubah setelah restart

**Solusi:**
- Gunakan Named Tunnel (Opsi 2) untuk URL tetap
- Quick Tunnel memang URL-nya random

---

## 📝 Script Bantuan

### start-all.bat (Lokal)
```batch
@echo off
echo Starting File Uploader...

start "Backend" cmd /k "cd backend && node dist/index.js"
timeout /t 3
start "Frontend" cmd /k "cd frontend && node serve.cjs"

echo.
echo ✅ Aplikasi berjalan!
echo 🌐 Akses: http://localhost:4173
echo.
pause
```

### start-online.bat (dengan Quick Tunnel)
```batch
@echo off
echo Starting File Uploader Online...

start "Backend" cmd /k "cd backend && node dist/index.js"
timeout /t 3
start "Frontend" cmd /k "cd frontend && node serve.cjs"
timeout /t 3
start "Tunnel-Frontend" cmd /k "cloudflared.exe tunnel --url http://localhost:4173"
timeout /t 3
start "Tunnel-Backend" cmd /k "cloudflared.exe tunnel --url http://localhost:3000"

echo.
echo ✅ Aplikasi berjalan online!
echo 📋 Cek terminal Tunnel untuk URL
echo.
pause
```

### start-named-tunnel.bat (dengan Named Tunnel)
```batch
@echo off
echo Starting File Uploader with Named Tunnel...

start "Backend" cmd /k "cd backend && node dist/index.js"
timeout /t 3
start "Frontend" cmd /k "cd frontend && node serve.cjs"
timeout /t 3
start "Tunnel" cmd /k "cloudflared.exe tunnel --config cloudflared-tunnel.yml run file-uploader"

echo.
echo ✅ Aplikasi berjalan!
echo 🌐 Frontend: https://upload.yourdomain.com
echo 🌐 Backend: https://api.yourdomain.com
echo.
pause
```

---

## 🎯 Fitur Aplikasi

### Upload
- Drag & drop file
- Multiple file upload
- Preview sebelum upload
- Real-time progress
- Chunked upload otomatis untuk file ≥50MB

### History
- Lihat semua upload
- Detail file (nama, ukuran, kategori, waktu)
- Path penyimpanan
- Refresh manual

### Kategorisasi Otomatis
- Photo → D:\uploads\Photo\
- Video → D:\uploads\Video\
- Document → D:\uploads\Document\
- Audio → D:\uploads\Audio\
- Archive → D:\uploads\Archive\
- Other → D:\uploads\Other\

---

## 📞 Bantuan Lebih Lanjut

### Dokumentasi Terkait
- `CLOUDFLARE_TUNNEL_SETUP.md` - Setup detail Cloudflare Tunnel
- `CHUNKED_UPLOAD_FEATURE.md` - Cara kerja chunked upload
- `UI_REDESIGN_COMPLETE.md` - Fitur UI terbaru

### Cloudflare Resources
- Dashboard: https://dash.cloudflare.com
- Tunnel Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
- Zero Trust: https://one.dash.cloudflare.com

---

**Terakhir diupdate:** 2026-04-14
**Versi:** 2.0
