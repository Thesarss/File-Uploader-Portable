# 🚀 Setup Ngrok untuk URL Tetap

## Kenapa Ngrok?

Ngrok lebih mudah dari Cloudflare dan bisa dapat URL tetap dengan akun gratis!

**Keuntungan:**
- ✅ Setup super mudah (5 menit)
- ✅ URL tetap selamanya (dengan akun gratis)
- ✅ Tidak perlu setup DNS
- ✅ HTTPS otomatis
- ✅ Langsung bisa dipakai

---

## 📋 Langkah Setup

### Step 1: Buat Akun Ngrok (GRATIS)

1. **Buka browser** dan pergi ke: https://dashboard.ngrok.com/signup
2. **Sign up** dengan:
   - Email + Password, atau
   - Google Account, atau
   - GitHub Account
3. **Verifikasi email** jika diminta
4. **Login** ke dashboard ngrok

### Step 2: Copy Authtoken

Setelah login ke dashboard:

1. Di halaman dashboard, Anda akan lihat **"Your Authtoken"**
2. **Copy authtoken** tersebut (format: `2abc...xyz`)
3. Authtoken ini seperti password, jangan bagikan ke orang lain!

**Contoh authtoken:**
```
2abcDEF123xyz456ABC789def012XYZ345abc678DEF901xyz234
```

### Step 3: Setup Authtoken di PC

Buka Command Prompt atau PowerShell, lalu jalankan:

```bash
ngrok config add-authtoken <PASTE_AUTHTOKEN_ANDA_DISINI>
```

**Contoh:**
```bash
ngrok config add-authtoken 2abcDEF123xyz456ABC789def012XYZ345abc678DEF901xyz234
```

**Output yang benar:**
```
Authtoken saved to configuration file: C:\Users\YourName\.ngrok2\ngrok.yml
```

### Step 4: Jalankan Aplikasi

Setelah authtoken di-setup, jalankan aplikasi:

```bash
start-with-ngrok.bat
```

Script ini akan:
1. Start backend server (port 3000)
2. Start frontend server (port 4173)
3. Start ngrok tunnel untuk frontend
4. Start ngrok tunnel untuk backend
5. Tampilkan URL yang bisa diakses

### Step 5: Akses Aplikasi

Setelah script jalan, Anda akan dapat 2 URL:

**Dengan akun gratis (URL random tapi tetap):**
- Frontend: `https://abc123.ngrok-free.app`
- Backend: `https://def456.ngrok-free.app`

**Dengan akun berbayar (URL custom):**
- Frontend: `https://widysarup.ngrok.app`
- Backend: `https://widysarup-api.ngrok.app`

---

## 🎯 Cara Dapat URL Tetap (Static Domain)

### Opsi 1: Akun Gratis (Recommended)

Dengan akun gratis, Anda dapat:
- 1 static domain gratis
- Format: `https://your-name.ngrok-free.app`
- URL ini tetap selamanya!

**Cara dapat static domain gratis:**
1. Login ke https://dashboard.ngrok.com
2. Klik "Domains" di sidebar
3. Klik "Create Domain" atau "New Domain"
4. Pilih nama domain (contoh: `widysarup`)
5. Domain Anda: `widysarup.ngrok-free.app`

### Opsi 2: Akun Berbayar ($8/bulan)

Dengan akun berbayar, Anda dapat:
- 3 static domains
- Format: `https://your-name.ngrok.app` (tanpa "-free")
- Lebih profesional
- Lebih banyak fitur

---

## 🔧 Konfigurasi Ngrok

Setelah dapat static domain, buat file `ngrok.yml`:

```yaml
version: "2"
authtoken: <YOUR_AUTHTOKEN>

tunnels:
  frontend:
    proto: http
    addr: 4173
    domain: widysarup.ngrok-free.app
  
  backend:
    proto: http
    addr: 3000
    domain: widysarup-api.ngrok-free.app
```

Simpan file ini di: `C:\Users\YourName\.ngrok2\ngrok.yml`

---

## 🚀 Cara Pakai Sehari-hari

### Jalankan Aplikasi:
```bash
start-with-ngrok.bat
```

### Akses dari Browser:
- Buka `https://widysarup.ngrok-free.app`
- Upload file!

### Bagikan ke Teman:
- Kirim URL: `https://widysarup.ngrok-free.app`
- Mereka bisa langsung akses dan upload file

---

## 📱 Akses dari HP/Tablet

1. Buka browser di HP
2. Ketik URL: `https://widysarup.ngrok-free.app`
3. Upload file dari HP!

File akan tersimpan di PC Anda: `D:\uploads\`

---

## 🛠️ Troubleshooting

### Error: "authtoken not found"

**Solusi:**
```bash
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

### Error: "tunnel not found"

**Solusi:**
1. Pastikan backend dan frontend sudah running
2. Restart ngrok

### Error: "domain already in use"

**Solusi:**
1. Ganti nama domain di ngrok.yml
2. Atau stop ngrok yang lain

### URL tidak bisa diakses

**Solusi:**
1. Cek apakah ngrok running
2. Cek apakah backend dan frontend running
3. Restart semua service

---

## 💡 Tips

### 1. Bookmark URL
Simpan URL ngrok di bookmark browser untuk akses cepat.

### 2. Shortcut di Desktop
Buat shortcut `start-with-ngrok.bat` di desktop.

### 3. Monitor Upload
Buka `D:\uploads\` di File Explorer untuk lihat file yang masuk.

### 4. Ngrok Dashboard
Akses http://localhost:4040 untuk lihat traffic ngrok real-time.

---

## 🎉 Selesai!

Setelah setup authtoken, aplikasi Anda akan online dengan URL tetap!

**Next Steps:**
1. Buat akun ngrok: https://dashboard.ngrok.com/signup
2. Copy authtoken
3. Jalankan: `ngrok config add-authtoken <TOKEN>`
4. Jalankan: `start-with-ngrok.bat`
5. Akses aplikasi!

**URL Anda akan tetap sama meskipun:**
- ✅ Laptop mati
- ✅ Restart aplikasi
- ✅ Restart Windows
- ✅ Besok, minggu depan, bulan depan

**Selamat menggunakan! 🚀**
