# 🚀 MULAI DISINI

## Panduan Cepat File Uploader

### ⚡ Quick Start

**1. Jalankan Lokal**
```bash
start-all.bat
```
Akses: http://localhost:4173

**2. Jalankan Online (URL Random)**
```bash
start-online-quick.bat
```
Cek terminal untuk URL

**3. Jalankan Online (URL Tetap)** ⭐
```bash
start-online-named.bat
```
Perlu setup dulu (lihat di bawah)

---

## 🌐 Setup URL Tetap (Sekali Saja)

### Langkah Singkat:

**1. Login Cloudflare**
```bash
.\cloudflared.exe tunnel login
```

**2. Buat Tunnel**
```bash
.\cloudflared.exe tunnel create file-uploader
```
Simpan TUNNEL-ID!

**3. Edit Config**
Copy `cloudflared-named-tunnel.yml` dan edit:
- Ganti `<TUNNEL-ID>` dengan ID Anda
- Ganti `<USERNAME>` dengan username Windows
- Ganti `yourdomain.com` dengan subdomain pilihan

**4. Setup DNS**
```bash
.\cloudflared.exe tunnel route dns file-uploader myupload.trycloudflare.com
.\cloudflared.exe tunnel route dns file-uploader myupload-api.trycloudflare.com
```

**5. Update Config Aplikasi**
- `frontend/.env`: `VITE_API_BASE_URL=https://myupload-api.trycloudflare.com`
- `backend/.env`: Tambahkan URL ke `ALLOWED_ORIGINS`

**6. Rebuild & Jalankan**
```bash
cd frontend && npm run build
start-online-named.bat
```

**Detail lengkap:** [CARA_BUAT_URL_TETAP.md](CARA_BUAT_URL_TETAP.md)

---

## 🎯 Cara Pakai

1. Buka browser → Akses URL
2. Seret file atau klik untuk browse
3. Klik "Upload"
4. File tersimpan di `D:\uploads\`

---

## 📚 Dokumentasi

- [PANDUAN_LENGKAP.md](PANDUAN_LENGKAP.md) - Panduan lengkap
- [CARA_BUAT_URL_TETAP.md](CARA_BUAT_URL_TETAP.md) - Tutorial URL tetap

---

## 🔧 Troubleshooting

**Upload Gagal:** Cek semua terminal running, folder D:\uploads ada

**CORS Error:** Tambahkan URL ke `ALLOWED_ORIGINS` di backend/.env

**URL Berubah:** Pakai Named Tunnel (setup di atas)

---

**Selamat menggunakan! 🎉**
