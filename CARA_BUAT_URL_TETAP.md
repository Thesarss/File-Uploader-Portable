# 🔗 Cara Membuat URL yang Sama (Tetap)

## 📌 Masalah dengan Quick Tunnel

Quick Tunnel memberikan URL random seperti:
- `https://usa-strengthen-pixel-chef.trycloudflare.com`
- `https://cornwall-visitors-ranked-publicly.trycloudflare.com`

**Masalah:** URL ini berubah setiap kali restart!

## ✅ Solusi: Named Tunnel (URL Tetap)

Named Tunnel memberikan URL yang TETAP dan tidak berubah, contoh:
- `https://upload.mydomain.com` (jika punya domain)
- `https://file-uploader.trycloudflare.com` (subdomain gratis)

---

## 🚀 Setup Named Tunnel (Step by Step)

### Persiapan
- Akun Cloudflare (gratis) - https://dash.cloudflare.com/sign-up
- File `cloudflared.exe` sudah ada di project
- Aplikasi sudah bisa jalan lokal

---

### Step 1: Login ke Cloudflare

Buka terminal di folder project, jalankan:

```bash
.\cloudflared.exe tunnel login
```

**Yang terjadi:**
1. Browser akan terbuka otomatis
2. Login dengan akun Cloudflare Anda
3. Pilih domain (atau buat baru jika belum punya)
4. Klik "Authorize"
5. Terminal akan menampilkan: "You have successfully logged in"

**Jika tidak punya domain:**
- Tidak masalah! Cloudflare akan memberikan subdomain gratis
- Lanjut ke step berikutnya

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

**PENTING:** Simpan ID tunnel ini! (contoh: `abc123def456`)

---

### Step 3: Setup File Konfigurasi

1. Copy file template:
```bash
copy cloudflared-named-tunnel.yml cloudflared-tunnel.yml
```

2. Edit file `cloudflared-tunnel.yml` dengan notepad:

**Ganti 3 hal ini:**

```yaml
# Ganti <TUNNEL-ID> dengan ID dari Step 2
tunnel: abc123def456

# Ganti <USERNAME> dengan username Windows Anda
credentials-file: C:\Users\YourName\.cloudflared\abc123def456.json

ingress:
  # Ganti yourdomain.com dengan domain Anda
  - hostname: upload.yourdomain.com
    service: http://localhost:4173
  
  - hostname: api.yourdomain.com
    service: http://localhost:3000
  
  - service: http_status:404
```

**Contoh jika pakai subdomain gratis:**
```yaml
tunnel: abc123def456
credentials-file: C:\Users\John\.cloudflared\abc123def456.json

ingress:
  - hostname: file-uploader.trycloudflare.com
    service: http://localhost:4173
  
  - hostname: file-uploader-api.trycloudflare.com
    service: http://localhost:3000
  
  - service: http_status:404
```

---

### Step 4: Setup DNS

**Jika punya domain sendiri:**
```bash
.\cloudflared.exe tunnel route dns file-uploader upload.yourdomain.com
.\cloudflared.exe tunnel route dns file-uploader api.yourdomain.com
```

**Jika pakai subdomain gratis:**
```bash
.\cloudflared.exe tunnel route dns file-uploader file-uploader.trycloudflare.com
.\cloudflared.exe tunnel route dns file-uploader file-uploader-api.trycloudflare.com
```

**Output:**
```
Created CNAME record for upload.yourdomain.com
Created CNAME record for api.yourdomain.com
```

---

### Step 5: Update Konfigurasi Aplikasi

**Frontend (.env):**
```env
# Ganti dengan URL backend Anda
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_TIMEOUT=300000
```

**Backend (.env):**
```env
# Tambahkan URL frontend ke ALLOWED_ORIGINS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173,https://upload.yourdomain.com
```

---

### Step 6: Rebuild Frontend

```bash
cd frontend
npm run build
```

---

### Step 7: Jalankan Aplikasi

**Cara 1: Manual**

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

**Cara 2: Otomatis (Pakai Script)**
```bash
start-online-named.bat
```

---

### Step 8: Akses Aplikasi

Buka browser, akses:
- **Frontend:** https://upload.yourdomain.com
- **Backend API:** https://api.yourdomain.com/health

**URL ini TETAP dan tidak akan berubah!**

---

## 🎯 Perbandingan Quick vs Named Tunnel

| Fitur | Quick Tunnel | Named Tunnel |
|-------|--------------|--------------|
| **URL** | Random | Tetap |
| **Setup** | 1 menit | 10-15 menit |
| **Akun** | Tidak perlu | Perlu (gratis) |
| **Biaya** | Gratis | Gratis |
| **Restart** | URL berubah | URL tetap |
| **Custom Domain** | Tidak bisa | Bisa |
| **Subdomain Gratis** | Ya (random) | Ya (pilih sendiri) |

---

## 💡 Tips & Trik

### Pilih Nama Subdomain yang Mudah
Contoh bagus:
- `myupload.trycloudflare.com`
- `fileupload.trycloudflare.com`
- `upload-app.trycloudflare.com`

### Simpan Konfigurasi
Backup file-file ini:
- `cloudflared-tunnel.yml`
- `C:\Users\YourName\.cloudflared\<TUNNEL-ID>.json`

### Cek Status Tunnel
```bash
.\cloudflared.exe tunnel list
```

### Hapus Tunnel (jika perlu)
```bash
.\cloudflared.exe tunnel delete file-uploader
```

---

## 🐛 Troubleshooting

### Error: "tunnel not found"
**Solusi:** Cek nama tunnel dengan `.\cloudflared.exe tunnel list`

### Error: "credentials file not found"
**Solusi:** Cek path di `cloudflared-tunnel.yml` sudah benar

### DNS tidak resolve
**Solusi:** 
1. Tunggu 1-2 menit (propagasi DNS)
2. Cek di Cloudflare Dashboard → DNS Records
3. Pastikan ada CNAME record untuk subdomain Anda

### CORS Error
**Solusi:**
1. Pastikan URL frontend sudah ditambahkan ke `ALLOWED_ORIGINS` di backend/.env
2. Restart backend

### 502 Bad Gateway
**Solusi:**
1. Pastikan backend dan frontend sudah running
2. Cek port 3000 dan 4173 tidak dipakai aplikasi lain
3. Restart semua service

---

## 📚 Resources

### Cloudflare Dashboard
- Login: https://dash.cloudflare.com
- Zero Trust: https://one.dash.cloudflare.com
- Tunnels: https://one.dash.cloudflare.com/tunnels

### Dokumentasi
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
- Named Tunnels: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide

---

## 🎉 Selesai!

Sekarang aplikasi Anda bisa diakses dengan URL yang tetap!

**Keuntungan:**
- ✅ URL tidak berubah saat restart
- ✅ Bisa dibagikan ke orang lain
- ✅ Lebih profesional
- ✅ Mudah diingat

**Contoh penggunaan:**
1. Bagikan link ke teman: "Upload file di https://upload.mydomain.com"
2. Akses dari HP: Buka browser, ketik URL
3. Bookmark di browser: URL tetap sama

---

**Terakhir diupdate:** 2026-04-14
**Versi:** 1.0
