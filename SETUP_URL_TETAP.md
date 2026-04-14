# 🔗 Setup URL Cloudflare yang Tetap (Tidak Berubah)

## 🎯 Masalah

**Quick Tunnel** (yang sekarang dipakai) memberikan URL random yang **BERUBAH** setiap restart:
- `https://usa-strengthen-pixel-chef.trycloudflare.com` ❌
- `https://cornwall-visitors-ranked-publicly.trycloudflare.com` ❌

Setiap kali laptop mati atau restart, URL berubah lagi!

## ✅ Solusi: Named Tunnel

**Named Tunnel** memberikan URL yang **TETAP SELAMANYA**:
- `https://myupload.trycloudflare.com` ✅
- URL ini tidak akan berubah meskipun laptop mati/restart berkali-kali!

---

## 🚀 Setup Named Tunnel (Step by Step)

### Step 1: Login ke Cloudflare

```bash
.\cloudflared.exe tunnel login
```

**Yang terjadi:**
1. Browser akan terbuka otomatis
2. Login dengan akun Cloudflare (buat akun gratis jika belum punya)
3. Pilih domain (atau skip jika tidak punya)
4. Klik "Authorize"
5. Terminal akan menampilkan: "You have successfully logged in"

**Catatan:** Akun Cloudflare 100% GRATIS!

---

### Step 2: Buat Tunnel dengan Nama

```bash
.\cloudflared.exe tunnel create file-uploader
```

**Output yang muncul:**
```
Tunnel credentials written to: C:\Users\YourName\.cloudflared\abc123def456.json
Created tunnel file-uploader with id abc123def456
```

**PENTING:** 
- Simpan **TUNNEL-ID** ini! (contoh: `abc123def456`)
- File credentials otomatis tersimpan di folder `.cloudflared`

---

### Step 3: Edit File Konfigurasi

1. Buka file `cloudflared-named-tunnel.yml` dengan notepad
2. Edit 3 bagian ini:

```yaml
# 1. Ganti <TUNNEL-ID> dengan ID dari Step 2
tunnel: abc123def456

# 2. Ganti <USERNAME> dengan username Windows Anda
credentials-file: C:\Users\YourName\.cloudflared\abc123def456.json

# 3. Ganti yourdomain.com dengan subdomain pilihan Anda
ingress:
  # Frontend - Web Interface
  - hostname: myupload.trycloudflare.com
    service: http://localhost:4173
  
  # Backend - API
  - hostname: myupload-api.trycloudflare.com
    service: http://localhost:3000
  
  # Catch-all (WAJIB ada)
  - service: http_status:404
```

**Contoh lengkap:**
```yaml
tunnel: abc123def456
credentials-file: C:\Users\Thesar\.cloudflared\abc123def456.json

ingress:
  - hostname: myupload.trycloudflare.com
    service: http://localhost:4173
  - hostname: myupload-api.trycloudflare.com
    service: http://localhost:3000
  - service: http_status:404
```

**Tips memilih subdomain:**
- Pilih nama yang mudah diingat
- Contoh: `fileupload.trycloudflare.com`, `upload-app.trycloudflare.com`
- Subdomain ini GRATIS dari Cloudflare!

---

### Step 4: Setup DNS

```bash
# Setup DNS untuk frontend
.\cloudflared.exe tunnel route dns file-uploader myupload.trycloudflare.com

# Setup DNS untuk backend
.\cloudflared.exe tunnel route dns file-uploader myupload-api.trycloudflare.com
```

**Output:**
```
Created CNAME record for myupload.trycloudflare.com
Created CNAME record for myupload-api.trycloudflare.com
```

**Catatan:** DNS setup hanya dilakukan SEKALI SAJA!

---

### Step 5: Update Konfigurasi Aplikasi

**Frontend (.env):**
```bash
cd frontend
notepad .env
```

Edit:
```env
VITE_API_BASE_URL=https://myupload-api.trycloudflare.com
VITE_API_TIMEOUT=300000
```

**Backend (.env):**
```bash
cd backend
notepad .env
```

Tambahkan URL frontend ke `ALLOWED_ORIGINS`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173,https://myupload.trycloudflare.com
```

---

### Step 6: Rebuild Frontend

```bash
cd frontend
npm run build
```

**Tunggu sampai selesai!**

---

### Step 7: Copy File Config

```bash
# Di root directory
copy cloudflared-named-tunnel.yml cloudflared-tunnel.yml
```

---

### Step 8: Jalankan Aplikasi

**Cara 1: Pakai Script (Recommended)**
```bash
start-online-named.bat
```

**Cara 2: Manual**

Terminal 1 - Backend:
```bash
cd backend
node dist/index.js
```

Terminal 2 - Frontend:
```bash
cd frontend
node serve.cjs
```

Terminal 3 - Tunnel:
```bash
.\cloudflared.exe tunnel --config cloudflared-tunnel.yml run file-uploader
```

---

### Step 9: Akses Aplikasi

**URL Anda (TETAP SELAMANYA!):**
- Frontend: `https://myupload.trycloudflare.com`
- Backend API: `https://myupload-api.trycloudflare.com`

**URL ini tidak akan berubah meskipun:**
- ✅ Laptop mati
- ✅ Restart aplikasi
- ✅ Restart Windows
- ✅ Mati listrik
- ✅ Besok, minggu depan, bulan depan

---

## 🎉 Selesai!

Sekarang URL Anda **TETAP** dan tidak akan berubah lagi!

### Keuntungan Named Tunnel:
- ✅ URL tetap selamanya
- ✅ Bisa dibagikan ke teman/keluarga
- ✅ Bisa di-bookmark
- ✅ Lebih profesional
- ✅ Mudah diingat

### Cara Pakai Sehari-hari:
1. Nyalakan laptop
2. Jalankan `start-online-named.bat`
3. Akses `https://myupload.trycloudflare.com`
4. Selesai!

---

## 📝 Catatan Penting

### File yang Harus Disimpan
Jangan hapus file-file ini:
- `cloudflared-tunnel.yml` - Config tunnel Anda
- `C:\Users\YourName\.cloudflared\<TUNNEL-ID>.json` - Credentials

### Backup Config
Backup file-file di atas ke cloud/USB untuk jaga-jaga.

### Cek Tunnel
Lihat tunnel yang sudah dibuat:
```bash
.\cloudflared.exe tunnel list
```

### Hapus Tunnel (Jika Perlu)
```bash
.\cloudflared.exe tunnel delete file-uploader
```

---

## 🔧 Troubleshooting

### Error: "tunnel not found"
**Solusi:** Cek nama tunnel dengan:
```bash
.\cloudflared.exe tunnel list
```

### Error: "credentials file not found"
**Solusi:** 
1. Cek path di `cloudflared-tunnel.yml` sudah benar
2. Pastikan file `.json` ada di folder `.cloudflared`

### DNS tidak resolve
**Solusi:**
1. Tunggu 1-2 menit (propagasi DNS)
2. Cek di Cloudflare Dashboard → DNS Records
3. Pastikan ada CNAME record

### CORS Error
**Solusi:**
1. Pastikan URL frontend sudah di `ALLOWED_ORIGINS`
2. Restart backend

### 502 Bad Gateway
**Solusi:**
1. Pastikan backend dan frontend sudah running
2. Cek port 3000 dan 4173 tidak dipakai aplikasi lain
3. Restart semua service

---

## 📊 Perbandingan

| Feature | Quick Tunnel | Named Tunnel |
|---------|--------------|--------------|
| **URL** | Random | Tetap |
| **Setup** | 1 menit | 10 menit |
| **Akun** | Tidak perlu | Perlu (gratis) |
| **Biaya** | Gratis | Gratis |
| **Restart** | URL berubah ❌ | URL tetap ✅ |
| **Custom** | Tidak bisa | Bisa pilih subdomain |
| **Cocok** | Testing | Production |

---

## 🎯 Kesimpulan

**Untuk URL yang TETAP dan tidak berubah:**
1. Gunakan **Named Tunnel** (bukan Quick Tunnel)
2. Setup sekali saja (10 menit)
3. URL tetap selamanya
4. Jalankan dengan `start-online-named.bat`

**URL Anda akan tetap sama meskipun laptop mati berkali-kali!**

---

**Selamat! URL Anda sekarang TETAP! 🎉**
